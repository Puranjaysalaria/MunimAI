import { LanguageCode } from '../i18n/types';

/**
 * SpeechSynthesis Wrapper for Spoken Replies
 * Voices responses in Hindi (hi-IN), Punjabi (pa-IN), and English (en-IN).
 */
export class SpeechSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  get isSupported(): boolean {
    return Boolean(this.synth);
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.synth) {
      this.synth.cancel();
    }
  }

  speak(text: string, lang: LanguageCode | string = 'hi'): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || this.isMuted || !text) {
        resolve();
        return;
      }

      this.synth.cancel(); // Stop any pending speech

      const langLocaleMap: Record<string, string> = {
        hi: 'hi-IN',
        en: 'en-IN',
        pa: 'pa-IN',
        gu: 'gu-IN',
        mr: 'mr-IN',
        bn: 'bn-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        kn: 'kn-IN',
        ml: 'ml-IN',
      };

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langLocaleMap[lang] || 'hi-IN';
      utterance.rate = 0.95; // Slightly slower for crisp clarity in noisy shop
      utterance.pitch = 1.0;

      // Select localized voice if available
      const voices = this.synth.getVoices();
      const targetPrefix = utterance.lang.toLowerCase().slice(0, 2);
      const matchingVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith(targetPrefix)
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      utterance.onend = safeResolve;
      utterance.onerror = safeResolve;

      // Chrome SpeechSynthesis watchdog to guarantee resolution
      const timeoutMs = Math.max(1500, Math.min(text.length * 80 + 1200, 5000));
      setTimeout(safeResolve, timeoutMs);

      this.synth.speak(utterance);
    });
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const speechSynthesizer = new SpeechSynthesizer();
