import { STTError, STTOptions, STTProvider, STTResult, STTState } from './types';
import { BrowserSpeechProvider } from './browserSpeechProvider';
import {
  DEFAULT_MAX_CLIP_DURATION_MS,
  GNANI_TARGET_SAMPLE_RATE,
  processCommandAudioBlob,
} from './audioClipProcessor';
import {
  HinglishMode,
  estimateSttCostInr,
  getLanguageVoiceProfile,
  getRemainingVoiceBudgetInr,
  isCloudSpeechKillSwitchActive,
  recordVoiceUsage,
} from '../voice/speechConfig';

/**
 * Reserved interface for future WebSocket streaming STT.
 * Do NOT implement WebSocket streaming yet; use REST command clips via GnaniSttProvider.
 */
export interface StreamingSTTInterface {
  connectStream(options: STTOptions & { sampleRate: number }): Promise<void>;
  pushAudioFrame(pcm16Frame: Int16Array): void;
  closeStream(): Promise<STTResult | null>;
}

export interface GnaniSttOptions extends STTOptions {
  hinglishMode?: HinglishMode;
  timeoutMs?: number;
  cloudSpeechEnabled?: boolean;
  shopId?: string;
}

const DEFAULT_GNANI_TIMEOUT_MS = 8_000;

export class GnaniSttProvider implements STTProvider {
  readonly id = 'gnani';
  readonly name = 'Gnani Cloud STT (with silent Browser fallback)';
  state: STTState = 'idle';

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private fallbackProvider: STTProvider;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private recordingStartedAtMs: number | undefined;
  private wasAborted = false;
  private usingFallback = false;

  constructor(fallbackProvider: STTProvider = new BrowserSpeechProvider()) {
    this.fallbackProvider = fallbackProvider;
  }

  get isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    );
  }

  private canUseCloudStt(options: GnaniSttOptions): boolean {
    if (options.cloudSpeechEnabled === false) return false;
    if (isCloudSpeechKillSwitchActive()) return false;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    if (getRemainingVoiceBudgetInr() <= 0) return false;
    if (!this.isSupported) return false;
    return true;
  }

  private clearMaxDurationTimer(): void {
    if (this.maxDurationTimer !== null) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
  }

  private async fallbackToBrowser(
    options: GnaniSttOptions,
    callbacks: {
      onResult: (result: STTResult) => void;
      onError: (error: STTError) => void;
      onStateChange: (state: STTState) => void;
      onSpeechStart?: (startedAtMs: number) => void;
    }
  ): Promise<void> {
    this.usingFallback = true;
    recordVoiceUsage({
      channel: 'stt',
      provider: 'browser_stt',
      activeProviderLabel: 'browser',
      latencyMs: 0,
      costInr: 0,
    });
    return this.fallbackProvider.startListening(options, callbacks);
  }

  async startListening(
    options: GnaniSttOptions,
    callbacks: {
      onResult: (result: STTResult) => void;
      onError: (error: STTError) => void;
      onStateChange: (state: STTState) => void;
      onSpeechStart?: (startedAtMs: number) => void;
    }
  ): Promise<void> {
    // Only record a short command clip while the voice pill is active
    if (options.isPillActive === false) {
      this.state = 'idle';
      callbacks.onStateChange('idle');
      return;
    }

    this.usingFallback = false;
    this.wasAborted = false;

    if (!this.canUseCloudStt(options)) {
      return this.fallbackToBrowser(options, callbacks);
    }

    const profile = getLanguageVoiceProfile(options.language);
    const maxDurationMs = options.maxDurationMs || DEFAULT_MAX_CLIP_DURATION_MS;
    const timeoutMs = options.timeoutMs || DEFAULT_GNANI_TIMEOUT_MS;
    const hinglishMode: HinglishMode | undefined = profile.supportsMixedLanguage
      ? options.hinglishMode || profile.hinglishMode
      : undefined;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      const mimeType =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.('audio/webm')
          ? 'audio/webm'
          : undefined;
      this.mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.recordingStartedAtMs = Date.now();
        this.state = 'listening';
        callbacks.onStateChange('listening');
        callbacks.onSpeechStart?.(this.recordingStartedAtMs);

        this.clearMaxDurationTimer();
        this.maxDurationTimer = setTimeout(() => {
          this.stopListening();
        }, maxDurationMs);
      };

      this.mediaRecorder.onstop = async () => {
        this.clearMaxDurationTimer();
        stream.getTracks().forEach((track) => track.stop());

        if (this.wasAborted) {
          this.audioChunks = [];
          this.state = 'idle';
          callbacks.onStateChange('idle');
          return;
        }

        this.state = 'processing';
        callbacks.onStateChange('processing');

        const rawBlob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });
        const startedAtMs = this.recordingStartedAtMs ?? Date.now();

        try {
          const processed = await processCommandAudioBlob(rawBlob, {
            maxDurationMs,
            targetSampleRate: GNANI_TARGET_SAMPLE_RATE,
            recordingStartedAtMs: startedAtMs,
          });

          if (!processed.hasSpeech || processed.wavBlob.size <= 44) {
            callbacks.onError({
              code: 'no-speech',
              message:
                options?.language === 'en'
                  ? 'No speech detected. Please speak again.'
                  : 'कोई आवाज़ सुनाई नहीं दी। कृपया फिर से बोलें।',
            });
            this.state = 'idle';
            callbacks.onStateChange('idle');
            return;
          }

          callbacks.onSpeechStart?.(processed.utteranceStartedAtMs);

          const endpoint =
            (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STT_API_URL) || '/api/gnani-stt';

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          const t0 = Date.now();

          try {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(options.shopId ? { 'x-shop-id': options.shopId } : {}),
              },
              body: JSON.stringify({
                audioBase64: processed.wavBase64,
                language: profile.sttLanguageCode,
                model: profile.sttModel,
                ...(hinglishMode && hinglishMode !== 'off' ? { hinglishMode } : {}),
                speechStartedAtMs: processed.utteranceStartedAtMs,
              }),
              signal: controller.signal,
            });
            clearTimeout(timer);

            if (!res.ok) {
              throw new Error(`Gnani STT HTTP ${res.status}`);
            }

            const data = await res.json();
            const latency = typeof data.latency === 'number' ? data.latency : Date.now() - t0;
            const costInr =
              typeof data.costInr === 'number' ? data.costInr : estimateSttCostInr(processed.durationMs);

            recordVoiceUsage({
              channel: 'stt',
              provider: 'gnani_stt',
              activeProviderLabel: 'gnani',
              latencyMs: latency,
              costInr,
            });

            callbacks.onResult({
              transcript: String(data.transcript || ''),
              isFinal: true,
              confidence: typeof data.confidence === 'number' ? data.confidence : 0.95,
              speechStartedAtMs:
                typeof data.speechStartedAtMs === 'number'
                  ? data.speechStartedAtMs
                  : processed.utteranceStartedAtMs,
            });
            this.state = 'idle';
            callbacks.onStateChange('idle');
          } catch {
            clearTimeout(timer);
            // Silent fallback to browser STT without alarming the user
            await this.fallbackToBrowser(options, callbacks);
          }
        } catch {
          await this.fallbackToBrowser(options, callbacks);
        }
      };

      this.mediaRecorder.start(250);
    } catch {
      // Silent fallback to browser STT on any capture failure
      await this.fallbackToBrowser(options, callbacks);
    }
  }

  stopListening(): void {
    this.clearMaxDurationTimer();
    if (this.usingFallback) {
      this.fallbackProvider.stopListening();
      return;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
  }

  abortListening(): void {
    this.wasAborted = true;
    this.clearMaxDurationTimer();
    if (this.usingFallback) {
      this.fallbackProvider.abortListening();
      return;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.state = 'idle';
  }
}
