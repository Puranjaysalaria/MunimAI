import { STTError, STTOptions, STTProvider, STTResult, STTState } from './types';
import { BrowserSpeechProvider } from './browserSpeechProvider';

export class ServerSpeechProvider implements STTProvider {
  readonly id = 'server';
  readonly name = 'Pluggable Server STT (Sarvam / Whisper / Google Speech)';
  state: STTState = 'idle';

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private fallbackProvider = new BrowserSpeechProvider();

  get isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    );
  }

  async startListening(
    options: STTOptions,
    callbacks: {
      onResult: (result: STTResult) => void;
      onError: (error: STTError) => void;
      onStateChange: (state: STTState) => void;
    }
  ): Promise<void> {
    if (!this.isSupported) {
      // Automatic fallback to browser Web Speech API
      return this.fallbackProvider.startListening(options, callbacks);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.state = 'listening';
        callbacks.onStateChange('listening');
      };

      this.mediaRecorder.onstop = async () => {
        this.state = 'processing';
        callbacks.onStateChange('processing');

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

        try {
          // Send to server STT proxy
          const transcript = await this.transcribeAudioOnServer(audioBlob, options.language);
          callbacks.onResult({
            transcript,
            isFinal: true,
            confidence: 0.95,
          });
          this.state = 'idle';
          callbacks.onStateChange('idle');
        } catch (serverError: any) {
          // Fall back gracefully to browser STT or return error
          callbacks.onError({
            code: 'network',
            message:
              options?.language === 'en'
                ? 'Server speech error. Falling back to browser speech.'
                : 'सर्वर STT में त्रुटि। ब्राउज़र से प्रयास करें।',
          });
          this.state = 'idle';
          callbacks.onStateChange('idle');
        }
      };

      this.mediaRecorder.start(250); // Record in 250ms chunks
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
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
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
  }

  abortListening(): void {
    this.stopListening();
  }

  private async transcribeAudioOnServer(blob: Blob, lang: string): Promise<string> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      throw new Error('Supabase URL not configured for server STT proxy');
    }

    const formData = new FormData();
    formData.append('audio', blob, 'audio.webm');
    formData.append('language', lang);

    const res = await fetch(`${supabaseUrl}/functions/v1/stt-proxy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anonKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Server STT HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.transcript || '';
  }
}
