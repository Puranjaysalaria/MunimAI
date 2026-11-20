import { LanguageCode } from '../i18n/types';

/**
 * Transliterates Gurmukhi text (Punjabi) to Devanagari Unicode.
 * Gurmukhi (0x0A00 - 0x0A7F) and Devanagari (0x0900 - 0x097F) share identical ISCII block layout with a 0x100 offset.
 */
export function gurmukhiToDevanagari(str: string): string {
  let res = '';
  const s = str.normalize('NFC');
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code === 0x0A71) {
      // Addak: geminate next consonant with halant
      if (i + 1 < s.length) {
        const nextCode = s.charCodeAt(i + 1);
        if (nextCode >= 0x0A00 && nextCode <= 0x0A7F) {
          res += String.fromCharCode(nextCode - 0x100) + '\u094D';
        }
      }
      continue;
    }
    if (code === 0x0A70) {
      res += '\u0902'; // Tippi -> Anusvara
      continue;
    }
    if (code >= 0x0A00 && code <= 0x0A7F) {
      res += String.fromCharCode(code - 0x100);
    } else {
      res += s[i];
    }
  }
  return res
    .replace(/\u0938\u093C/g, 'श')
    .replace(/\u0916\u093C/g, 'ख़')
    .replace(/\u0917\u093C/g, 'ग़')
    .replace(/\u091C\u093C/g, 'ज़')
    .replace(/\u092B\u093C/g, 'फ़')
    .replace(/\u0932\u093C/g, 'ळ');
}

/**
 * Transliterates Gujarati text to Devanagari Unicode (0x180 offset).
 */
export function gujaratiToDevanagari(str: string): string {
  let res = '';
  const s = str.normalize('NFC');
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0x0A80 && code <= 0x0AFF) {
      res += String.fromCharCode(code - 0x180);
    } else {
      res += s[i];
    }
  }
  return res;
}

/**
 * Transliterates Bengali text to Devanagari Unicode (0x80 offset).
 */
export function bengaliToDevanagari(str: string): string {
  let res = '';
  const s = str.normalize('NFC');
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0x0980 && code <= 0x09FF) {
      res += String.fromCharCode(code - 0x80);
    } else {
      res += s[i];
    }
  }
  return res;
}

/**
 * Transliterates Indic text to Devanagari for playback via Hindi TTS voice.
 */
export function indicToDevanagari(text: string, lang: string): string {
  if (lang === 'pa') return gurmukhiToDevanagari(text);
  if (lang === 'gu') return gujaratiToDevanagari(text);
  if (lang === 'bn') return bengaliToDevanagari(text);
  return text;
}

/**
 * SpeechSynthesis Wrapper for Spoken Replies
 * Voices responses across all 10 Indic languages with intelligent voice matching and phonetic fallback.
 */
export class SpeechSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private isMuted: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if ('onvoiceschanged' in this.synth) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    try {
      const list = this.synth.getVoices();
      if (list && list.length > 0) {
        this.voices = list;
      }
    } catch {
      // Ignore voice retrieval errors
    }
    return this.voices;
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

  private resolveBestVoice(lang: string): { voice: SpeechSynthesisVoice | null; voiceLang: string; useDevanagari: boolean } {
    const voices = this.loadVoices();
    if (!voices || voices.length === 0) {
      return { voice: null, voiceLang: 'en-IN', useDevanagari: false };
    }

    const targetPrefix = lang.toLowerCase().slice(0, 2);

    // 1. Direct match for target language
    const directVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(targetPrefix) ||
        v.name.toLowerCase().includes(lang.toLowerCase())
    );
    if (directVoice) {
      return { voice: directVoice, voiceLang: directVoice.lang, useDevanagari: false };
    }

    // 2. If target is an Indic language, fallback to Hindi voice (with Devanagari transliteration)
    if (targetPrefix !== 'en') {
      const hindiVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('hi') ||
          v.name.toLowerCase().includes('hindi') ||
          v.name.toLowerCase().includes('kalpana')
      );
      if (hindiVoice) {
        return { voice: hindiVoice, voiceLang: hindiVoice.lang, useDevanagari: true };
      }
    }

    // 3. Indian English voice fallback
    const indianEngVoice = voices.find(
      (v) =>
        v.lang.toLowerCase() === 'en-in' ||
        v.name.toLowerCase().includes('india') ||
        v.name.toLowerCase().includes('ravi') ||
        v.name.toLowerCase().includes('heera')
    );
    if (indianEngVoice) {
      return { voice: indianEngVoice, voiceLang: indianEngVoice.lang, useDevanagari: false };
    }

    // 4. Any English voice
    const engVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (engVoice) {
      return { voice: engVoice, voiceLang: engVoice.lang, useDevanagari: false };
    }

    // 5. First system voice
    return { voice: voices[0], voiceLang: voices[0].lang, useDevanagari: false };
  }

  speak(text: string, lang: LanguageCode | string = 'hi'): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || this.isMuted || !text) {
        resolve();
        return;
      }

      try {
        this.synth.cancel(); // Stop any pending speech
      } catch {
        // Ignore cancel errors
      }

      const { voice, voiceLang, useDevanagari } = this.resolveBestVoice(lang);

      // If we fall back to a Hindi voice for a regional Indic language, transliterate text to Devanagari
      let spokenText = text;
      if (useDevanagari) {
        spokenText = indicToDevanagari(text, lang);
      }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = voice ? voice.lang : (voiceLang || 'hi-IN');
      if (voice) {
        utterance.voice = voice;
      }
      utterance.rate = 0.95; // Slightly slower for crisp clarity in noisy shop
      utterance.pitch = 1.0;

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
      const timeoutMs = Math.max(1500, Math.min(spokenText.length * 80 + 1200, 5000));
      setTimeout(safeResolve, timeoutMs);

      try {
        this.synth.speak(utterance);
      } catch {
        safeResolve();
      }
    });
  }

  stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
  }
}

export const speechSynthesizer = new SpeechSynthesizer();
