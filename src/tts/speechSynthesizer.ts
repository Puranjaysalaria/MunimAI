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

  speak(text: string, lang: 'hi' | 'pa' | 'en' = 'hi'): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || this.isMuted || !text) {
        resolve();
        return;
      }

      this.synth.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'pa' ? 'pa-IN' : lang === 'en' ? 'en-IN' : 'hi-IN';
      utterance.rate = 0.95; // Slightly slower for crisp clarity in noisy shop
      utterance.pitch = 1.0;

      // Select localized voice if available
      const voices = this.synth.getVoices();
      const matchingVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith(utterance.lang.toLowerCase().slice(0, 2))
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

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
