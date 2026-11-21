import { WakeWordProvider, WakeWordOptions } from './types';

// SpeechRecognition type polyfill
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

// Multilingual wake word regex matching "Munim" across Indic scripts and phonetic Hinglish
// Supports prefixes (hey, hello, suno, etc.) and suffixes (ji, jee, etc.)
export const WAKE_WORD_REGEX =
  /(?:^|[\s,.\-_]|\b)(?:hey|hello|hi|ok|okay|suno|sun|arey|arre|oye|yo|हे|सुनो|सुन|अरे|ऐ|ओ|हेलो|हाय|ਸੁਣੋ|ਸੁਣ|ਓਏ|ਹੈਲੋ|સાંભળો|শুনুন|వినండి|కೇಳಿ)?\s*(?:munim|muneem|moneem|monim|moonim|मुनीम|मुनिम|ਮੁਨੀਮ|ਮੁਨਿਮ|મુનીમ|મુનિમ|মুনিম|মুনীম|முனீம்|முனிம்|మునీమ్|మునిమ్|ಮುನೀಮ್|ಮುನಿಮ್|മുനീം|മുനിം)(?:\s*(?:ji|jee|g|जी|ਜੀ|জি|జీ|ಜೀ|ജീ))?(?:[\s,.\-_]|\b|$)/iu;

export function extractWakeWordAndCommand(transcript: string): { matched: boolean; command: string } {
  if (!transcript || typeof transcript !== 'string') {
    return { matched: false, command: '' };
  }

  const match = transcript.match(WAKE_WORD_REGEX);
  if (!match || match.index === undefined) {
    return { matched: false, command: '' };
  }

  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;
  const before = transcript.slice(0, matchStart).trim();
  const after = transcript.slice(matchEnd).trim();
  let remaining = (before ? before + ' ' : '') + after;

  // Strip leading/trailing punctuation or noise characters
  remaining = remaining.replace(/^[,.\s\-_!?:;]+|[,.\s\-_!?:;]+$/g, '').trim();

  return {
    matched: true,
    command: remaining,
  };
}

export class WebSpeechWakeWordProvider implements WakeWordProvider {
  readonly id = 'webspeech-wakeword';
  readonly name = 'Web Speech Wake Word Provider';
  private recognition: any = null;
  private _isListening = false;
  private _isActive = false;
  private isTransitioning = false;
  private restartTimeout: any = null;
  private onDetectedCallback: ((command?: string) => void) | null = null;
  private currentLanguage = 'hi-IN';

  get isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as IWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  get isListening(): boolean {
    return this._isListening;
  }

  async startListening(
    options: WakeWordOptions = {},
    onDetected: (command?: string) => void
  ): Promise<void> {
    if (!this.isSupported) {
      console.warn('[WakeWord] Web Speech API not supported on this device/browser.');
      return;
    }

    this.stopListening();
    this.onDetectedCallback = onDetected;
    this.currentLanguage = options.language || 'hi-IN';
    this._isActive = true;
    this.isTransitioning = false;

    this.initRecognition();
  }

  private initRecognition(): void {
    if (!this._isActive || this.isTransitioning) return;
    if (!this.isSupported) return;

    this.cleanupRecognition();

    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLanguage;
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        this._isListening = true;
      };

      this.recognition.onresult = (event: any) => {
        if (!this._isActive || this.isTransitioning) return;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0]?.transcript?.trim() || '';
          if (!transcript) continue;

          const { matched, command } = extractWakeWordAndCommand(transcript);

          if (matched) {
            console.log(`[WakeWord] "Munim" detected: "${transcript}" -> Command: "${command}"`);
            this.isTransitioning = true;
            this.cleanupRecognition();
            this._isListening = false;

            if (this.onDetectedCallback) {
              this.onDetectedCallback(command);
            }

            // Keep hardware transition lock briefly to avoid race conditions with STT activation
            setTimeout(() => {
              this.isTransitioning = false;
            }, 800);
            break;
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          console.warn('[WakeWord] Microphone permission not allowed for wake word.');
          this._isActive = false;
          this._isListening = false;
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.debug('[WakeWord] Background speech error:', event.error);
        }
      };

      this.recognition.onend = () => {
        this._isListening = false;
        // Clean restart if user still has wake word active and not in transition
        if (this._isActive && !this.isTransitioning) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this._isActive && !this.isTransitioning) {
              this.initRecognition();
            }
          }, 300);
        }
      };

      this.recognition.start();
    } catch (err) {
      console.warn('[WakeWord] Failed to initialize recognition:', err);
      this._isListening = false;
    }
  }

  private cleanupRecognition(): void {
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort(); // Immediately cut mic hardware
      } catch {}
      this.recognition = null;
    }
  }

  stopListening(): void {
    this._isActive = false;
    this._isListening = false;
    clearTimeout(this.restartTimeout);
    this.cleanupRecognition();
  }
}

export const webSpeechWakeWordProvider = new WebSpeechWakeWordProvider();
