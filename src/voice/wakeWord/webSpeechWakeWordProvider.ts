import { WakeWordProvider, WakeWordOptions } from './types';

// SpeechRecognition type polyfill
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

const WAKE_WORD_PATTERNS = [
  /\b(?:hey\s+|hello\s+|ok\s+|suno\s+)?munim(?:\s*ji)?\b/i,
  /(?:^|\s)(?:हे\s+|सुनो\s+)?मुनीम(?:\s*जी)?(?:$|\s)/u,
  /(?:^|\s)(?:ਸੁਣੋ\s+)?ਮੁਨੀਮ(?:\s*ਜੀ)?(?:$|\s)/u,
  /(?:^|\s)મુનીમ(?:$|\s)/u,
  /(?:^|\s)মুনিম(?:$|\s)/u,
  /(?:^|\s)முனீம்(?:$|\s)/u,
  /(?:^|\s)మునీమ్(?:$|\s)/u,
  /(?:^|\s)ಮುನೀಮ್(?:$|\s)/u,
  /(?:^|\s)മുനീം(?:$|\s)/u,
];

export class WebSpeechWakeWordProvider implements WakeWordProvider {
  readonly id = 'webspeech-wakeword';
  readonly name = 'Web Speech Wake Word Provider';
  private recognition: any = null;
  private _isListening = false;
  private onDetectedCallback: (() => void) | null = null;
  private currentLanguage = 'hi-IN';

  get isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as IWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  get isListening(): boolean {
    return this._isListening;
  }

  async startListening(options: WakeWordOptions = {}, onDetected: () => void): Promise<void> {
    if (!this.isSupported) {
      console.warn('[WakeWord] Web Speech API not supported on this device/browser.');
      return;
    }

    if (this._isListening) {
      this.stopListening();
    }

    this.onDetectedCallback = onDetected;
    this.currentLanguage = options.language || 'hi-IN';

    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLanguage;
      this.recognition.maxAlternatives = 3;

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim().toLowerCase();
          const isMatch = WAKE_WORD_PATTERNS.some((p) => p.test(transcript));

          if (isMatch) {
            console.log(`[WakeWord] "Munim" detected in transcript: "${transcript}"`);
            this.stopListening();
            if (this.onDetectedCallback) {
              this.onDetectedCallback();
            }
            break;
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        // Ignore aborted / no-speech errors in background listening
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.debug('[WakeWord] Background speech error:', event.error);
        }
      };

      this.recognition.onend = () => {
        // Auto-restart if still enabled
        if (this._isListening && this.recognition) {
          try {
            this.recognition.start();
          } catch {
            this._isListening = false;
          }
        }
      };

      this.recognition.start();
      this._isListening = true;
    } catch (err) {
      console.warn('[WakeWord] Failed to initialize recognition:', err);
      this._isListening = false;
    }
  }

  stopListening(): void {
    this._isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
  }
}

export const webSpeechWakeWordProvider = new WebSpeechWakeWordProvider();
