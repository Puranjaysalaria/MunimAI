import { STTError, STTOptions, STTProvider, STTResult, STTState } from './types';

// Extend window for Web Speech API types
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class BrowserSpeechProvider implements STTProvider {
  readonly id = 'browser';
  readonly name = 'Web Speech API (Browser)';
  state: STTState = 'idle';

  private recognition: any = null;
  private onResultCallback?: (result: STTResult) => void;
  private onErrorCallback?: (error: STTError) => void;
  private onStateChangeCallback?: (state: STTState) => void;

  get isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as IWindow;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  private mapLanguage(lang: string): string {
    const map: Record<string, string> = {
      hi: 'hi-IN',
      'hi-IN': 'hi-IN',
      en: 'en-IN',
      'en-IN': 'en-IN',
      pa: 'pa-IN',
      'pa-IN': 'pa-IN',
      'pa-Guru-IN': 'pa-IN',
      gu: 'gu-IN',
      'gu-IN': 'gu-IN',
      mr: 'mr-IN',
      'mr-IN': 'mr-IN',
      bn: 'bn-IN',
      'bn-IN': 'bn-IN',
      ta: 'ta-IN',
      'ta-IN': 'ta-IN',
      te: 'te-IN',
      'te-IN': 'te-IN',
      kn: 'kn-IN',
      'kn-IN': 'kn-IN',
      ml: 'ml-IN',
      'ml-IN': 'ml-IN',
    };
    return map[lang] || 'hi-IN';
  }

  async startListening(
    options: STTOptions,
    callbacks: {
      onResult: (result: STTResult) => void;
      onError: (error: STTError) => void;
      onStateChange: (state: STTState) => void;
    }
  ): Promise<void> {
    const lang = options.language || 'hi';

    if (!this.isSupported) {
      callbacks.onError({
        code: 'not-allowed',
        message:
          lang === 'en'
            ? 'Speech recognition is not supported in this browser.'
            : lang === 'pa'
            ? 'ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਆਵਾਜ਼ ਪਛਾਣਨ ਦੀ ਸਹੂਲਤ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।'
            : 'इस ब्राउज़र में आवाज़ पहचानने की सुविधा उपलब्ध नहीं है।',
      });
      return;
    }

    this.onResultCallback = callbacks.onResult;
    this.onErrorCallback = callbacks.onError;
    this.onStateChangeCallback = callbacks.onStateChange;

    const win = window as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.lang = this.mapLanguage(options.language);
      this.recognition.continuous = options.continuous ?? false;
      this.recognition.interimResults = options.interimResults ?? true;
      this.recognition.maxAlternatives = options.maxAlternatives ?? 1;

      this.recognition.onstart = () => {
        this.state = 'listening';
        this.onStateChangeCallback?.('listening');
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let confidence = 0.9;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) {
            finalTranscript += text;
            confidence = res[0].confidence || 0.9;
          } else {
            interimTranscript += text;
          }
        }

        const transcript = (finalTranscript || interimTranscript).trim();
        const isFinal = Boolean(finalTranscript);

        if (transcript) {
          this.onResultCallback?.({
            transcript,
            isFinal,
            confidence: isFinal ? confidence : 0.8,
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        let code: STTError['code'] = 'unknown';
        const isEn = lang === 'en';
        const isPa = lang === 'pa';
        let msg = isEn
          ? 'Speech recognition error occurred.'
          : isPa
          ? 'ਆਵਾਜ਼ ਪਛਾਣਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ।'
          : 'आवाज़ पहचानने में त्रुटि हुई।';

        if (event.error === 'not-allowed') {
          code = 'not-allowed';
          msg = isEn
            ? 'Microphone permission denied. Please allow microphone access.'
            : isPa
            ? 'ਮਾਈਕ ਦੀ ਇਜਾਜ਼ਤ ਨਹੀਂ ਮਿਲੀ। ਕਿਰਪਾ ਕਰਕੇ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਇਜਾਜ਼ਤ ਦਿਓ।'
            : 'माइक की अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग में अनुमति दें।';
        } else if (event.error === 'no-speech') {
          code = 'no-speech';
          msg = isEn
            ? 'No speech detected. Please speak again.'
            : isPa
            ? 'ਕੋਈ ਆਵਾਜ਼ ਸੁਣਾਈ ਨਹੀਂ ਦਿੱਤੀ।'
            : 'कोई आवाज़ सुनाई नहीं दी।';
        } else if (event.error === 'audio-capture') {
          code = 'audio-capture';
          msg = isEn
            ? 'No audio signal from microphone.'
            : isPa
            ? 'ਮਾਈਕ੍ਰੋਫੋਨ ਤੋਂ ਆਵਾਜ਼ ਨਹੀਂ ਆ ਰਹੀ।'
            : 'माइक से आवाज़ नहीं आ रही है।';
        } else if (event.error === 'network') {
          code = 'network';
          msg = isEn
            ? 'Network error. Please check your internet.'
            : isPa
            ? 'ਨੈੱਟਵਰਕ ਸਮੱਸਿਆ। ਇੰਟਰਨੈੱਟ ਚੈੱਕ ਕਰੋ।'
            : 'नेटवर्क समस्या। कृपया इंटरनेट जांचें।';
        }

        this.state = 'error';
        this.onStateChangeCallback?.('error');
        this.onErrorCallback?.({ code, message: msg });
      };

      this.recognition.onend = () => {
        this.state = 'idle';
        this.onStateChangeCallback?.('idle');
      };

      this.recognition.start();
    } catch (err: any) {
      this.state = 'error';
      this.onStateChangeCallback?.('error');
      this.onErrorCallback?.({
        code: 'unknown',
        message: err?.message || 'माइक शुरू नहीं हो सका',
      });
    }
  }

  stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.state = 'idle';
    this.onStateChangeCallback?.('idle');
  }

  abortListening(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }
    this.state = 'idle';
    this.onStateChangeCallback?.('idle');
  }
}
