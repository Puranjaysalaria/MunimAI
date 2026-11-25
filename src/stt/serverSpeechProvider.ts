import { STTError, STTOptions, STTProvider, STTResult, STTState } from './types';
import { BrowserSpeechProvider } from './browserSpeechProvider';
import {
  DEFAULT_MAX_CLIP_DURATION_MS,
  GNANI_TARGET_SAMPLE_RATE,
  processCommandAudioBlob,
} from './audioClipProcessor';

export interface ServerSTTResponse {
  transcript: string;
  confidence?: number;
  speechStartedAtMs?: number;
  language?: string;
}

export class ServerSpeechProvider implements STTProvider {
  readonly id = 'server';
  readonly name = 'Gnani Server STT (16kHz Mono WAV)';
  state: STTState = 'idle';

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private fallbackProvider = new BrowserSpeechProvider();
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private recordingStartedAtMs: number | undefined;
  private wasAborted = false;

  get isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    );
  }

  private getConfiguredMaxDurationMs(options: STTOptions): number {
    if (options.maxDurationMs && options.maxDurationMs > 0) {
      return options.maxDurationMs;
    }
    const envVal =
      typeof import.meta !== 'undefined' && import.meta.env
        ? Number(import.meta.env.VITE_STT_MAX_CLIP_MS)
        : NaN;
    return Number.isFinite(envVal) && envVal > 0 ? envVal : DEFAULT_MAX_CLIP_DURATION_MS;
  }

  private clearMaxDurationTimer(): void {
    if (this.maxDurationTimer !== null) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
  }

  async startListening(
    options: STTOptions,
    callbacks: {
      onResult: (result: STTResult) => void;
      onError: (error: STTError) => void;
      onStateChange: (state: STTState) => void;
      onSpeechStart?: (startedAtMs: number) => void;
    }
  ): Promise<void> {
    // Only record a command clip while the voice pill is active
    if (options.isPillActive === false) {
      this.state = 'idle';
      callbacks.onStateChange('idle');
      return;
    }

    if (!this.isSupported) {
      // Automatic fallback to browser Web Speech API
      return this.fallbackProvider.startListening(options, callbacks);
    }

    const maxDurationMs = this.getConfiguredMaxDurationMs(options);
    this.wasAborted = false;

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

        // Cap command clip length (configurable, default 15 seconds)
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

          // Refine client-side speech start time after leading-silence trimming
          callbacks.onSpeechStart?.(processed.utteranceStartedAtMs);

          const serverResult = await this.transcribeAudioOnServer(
            processed.wavBase64,
            options.language,
            processed.utteranceStartedAtMs
          );

          callbacks.onResult({
            transcript: serverResult.transcript,
            isFinal: true,
            confidence: serverResult.confidence ?? 0.95,
            speechStartedAtMs: serverResult.speechStartedAtMs ?? processed.utteranceStartedAtMs,
          });
          this.state = 'idle';
          callbacks.onStateChange('idle');
        } catch {
          callbacks.onError({
            code: 'network',
            message:
              options?.language === 'en'
                ? 'Server speech error. Please try again.'
                : 'सर्वर STT में त्रुटि। कृपया पुनः प्रयास करें।',
          });
          this.state = 'idle';
          callbacks.onStateChange('idle');
        }
      };

      this.mediaRecorder.start(250); // Record in 250ms chunks
    } catch (err: any) {
      this.clearMaxDurationTimer();
      if (err?.name === 'NotAllowedError') {
        callbacks.onError({
          code: 'not-allowed',
          message:
            options?.language === 'en'
              ? 'Microphone permission denied.'
              : 'माइक की अनुमति नहीं मिली।',
        });
      } else {
        callbacks.onError({
          code: 'audio-capture',
          message:
            options?.language === 'en'
              ? 'Error activating microphone.'
              : 'माइक चालू करने में त्रुटि।',
        });
      }
      this.state = 'idle';
      callbacks.onStateChange('idle');
    }
  }

  stopListening(): void {
    this.clearMaxDurationTimer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
  }

  abortListening(): void {
    this.wasAborted = true;
    this.clearMaxDurationTimer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.state = 'idle';
  }

  private async transcribeAudioOnServer(
    wavBase64: string,
    lang: string,
    speechStartedAtMs: number
  ): Promise<ServerSTTResponse> {
    const customUrl =
      typeof import.meta !== 'undefined' && import.meta.env
        ? import.meta.env.VITE_STT_API_URL
        : undefined;
    const endpoint = customUrl || '/api/gnani-stt';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioBase64: wavBase64,
        format: 'wav-16k-mono-16bit',
        sampleRate: GNANI_TARGET_SAMPLE_RATE,
        language: lang,
        speechStartedAtMs,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server STT HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      transcript: data.transcript || '',
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.95,
      speechStartedAtMs:
        typeof data.speechStartedAtMs === 'number' ? data.speechStartedAtMs : speechStartedAtMs,
      language: data.language || lang,
    };
  }
}
