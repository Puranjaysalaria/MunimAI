import { LanguageCode } from '../i18n/types';
import { getCachedTTSAudio, hashTTSText, setCachedTTSAudio } from './ttsCache';
import {
  FallbackReason,
  SpeakingProviderId,
  estimateTtsCostInr,
  getLanguageVoiceProfile,
  getRemainingVoiceBudgetInr,
  isCloudSpeechKillSwitchActive,
  recordVoiceUsage,
} from '../voice/speechConfig';

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
 * Transliterates Telugu text to Devanagari Unicode (0x300 offset).
 */
export function teluguToDevanagari(str: string): string {
  let res = '';
  const s = str.normalize('NFC');
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0x0C00 && code <= 0x0C7F) {
      res += String.fromCharCode(code - 0x300);
    } else {
      res += s[i];
    }
  }
  return res;
}

/**
 * Transliterates Kannada text to Devanagari Unicode (0x380 offset).
 */
export function kannadaToDevanagari(str: string): string {
  let res = '';
  const s = str.normalize('NFC');
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0x0C80 && code <= 0x0CFF) {
      res += String.fromCharCode(code - 0x380);
    } else {
      res += s[i];
    }
  }
  return res;
}

/**
 * Transliterates Malayalam text to Devanagari Unicode (0x400 offset).
 */
export function malayalamToDevanagari(str: string): string {
  let res = '';
  const s = str.normalize('NFC');
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0x0D00 && code <= 0x0D7F) {
      res += String.fromCharCode(code - 0x400);
    } else {
      res += s[i];
    }
  }
  return res;
}

/**
 * Transliterates Tamil text to Devanagari Unicode (0x280 offset).
 */
export function tamilToDevanagari(str: string): string {
  let res = '';
  const s = str.normalize('NFC');
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0x0B80 && code <= 0x0BFF) {
      res += String.fromCharCode(code - 0x280);
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
  if (lang === 'te') return teluguToDevanagari(text);
  if (lang === 'kn') return kannadaToDevanagari(text);
  if (lang === 'ml') return malayalamToDevanagari(text);
  if (lang === 'ta') return tamilToDevanagari(text);
  return text;
}

/**
 * Brahmic / Devanagari vowel and consonant mappings to Roman phonetics
 */
const DEVA_VOWELS: Record<string, string> = {
  '\u0905': 'a',
  '\u0906': 'aa',
  '\u0907': 'i',
  '\u0908': 'ee',
  '\u0909': 'u',
  '\u090A': 'oo',
  '\u090B': 'ri',
  '\u090F': 'e',
  '\u0910': 'ai',
  '\u0913': 'o',
  '\u0914': 'au',
};

const DEVA_MATRAS: Record<string, string> = {
  '\u093E': 'aa',
  '\u093F': 'i',
  '\u0940': 'ee',
  '\u0941': 'u',
  '\u0942': 'oo',
  '\u0943': 'ri',
  '\u0947': 'e',
  '\u0948': 'ai',
  '\u094B': 'o',
  '\u094C': 'au',
  '\u094D': '', // Halant (suppresses inherent 'a')
};

const DEVA_CONSONANTS: Record<string, string> = {
  '\u0915': 'k',
  '\u0916': 'kh',
  '\u0917': 'g',
  '\u0918': 'gh',
  '\u0919': 'ng',
  '\u091A': 'ch',
  '\u091B': 'chh',
  '\u091C': 'j',
  '\u091D': 'jh',
  '\u091E': 'ny',
  '\u091F': 't',
  '\u0920': 'th',
  '\u0921': 'd',
  '\u0922': 'dh',
  '\u0923': 'n',
  '\u0924': 't',
  '\u0925': 'th',
  '\u0926': 'd',
  '\u0927': 'dh',
  '\u0928': 'n',
  '\u092A': 'p',
  '\u092B': 'ph',
  '\u092C': 'b',
  '\u092D': 'bh',
  '\u092E': 'm',
  '\u092F': 'y',
  '\u0930': 'r',
  '\u0932': 'l',
  '\u0935': 'v',
  '\u0936': 'sh',
  '\u0937': 'sh',
  '\u0938': 's',
  '\u0939': 'h',
  '\u0958': 'q',
  '\u0959': 'kh',
  '\u095A': 'gh',
  '\u095B': 'z',
  '\u095C': 'r',
  '\u095D': 'rh',
  '\u095E': 'f',
  '\u0933': 'l',
};

/**
 * Transliterates Devanagari text to Roman phonetic text with modern Indic schwa-deletion.
 */
export function devanagariToRomanPhonetic(str: string): string {
  let out = '';
  const s = str.normalize('NFC');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (DEVA_VOWELS[ch]) {
      out += DEVA_VOWELS[ch];
    } else if (DEVA_MATRAS[ch] !== undefined) {
      out += DEVA_MATRAS[ch];
    } else if (ch === '\u0902' || ch === '\u0901') {
      out += 'n';
    } else if (DEVA_CONSONANTS[ch]) {
      const base = DEVA_CONSONANTS[ch];
      const next = i + 1 < s.length ? s[i + 1] : '';
      if (DEVA_MATRAS[next] !== undefined) {
        out += base;
      } else if (i + 1 === s.length || /\s|[.,!?|।]/.test(next)) {
        // Schwa deletion at end of words
        out += base;
      } else {
        out += base + 'a';
      }
    } else if (ch === '।') {
      out += '.';
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * High-frequency phrase dictionaries for Indic languages.
 * When speaking through an English/Indian-English voice (like Microsoft Heera or Ravi on Windows),
 * these ensure conversational clarity and authentic Indic pronunciation.
 */
const INDIC_PHRASE_DICTIONARY: Record<string, [string, string][]> = {
  pa: [
    ['ਲਈ', 'layi'],
    ['ਖੋਲ੍ਹਿਆ ਗਿਆ', 'kholya gaya'],
    ['ਖੋਲ੍ਹਿਆ ਜਾ ਰਿਹਾ ਹੈ', 'kholya ja reha hai'],
    ['ਯਾਦ-ਪੱਤਰ', 'reminder'],
    ['ਕਤਾਰ ਵਿੱਚ', 'kataar vich'],
    ['ਬਾਕੀ ਹਨ', 'baaki han'],
    ['ਬਾਕੀ ਹੈ', 'baaki hai'],
    ['ਸਾਰੇ ਤਿਆਰ ਹਨ', 'saare taiyaar han'],
    ['ਸਾਰੇ ਪੂਰੇ ਹੋ ਚੁੱਕੇ ਹਨ', 'saare poore ho chuke han'],
    ['ਸਿੰਘ', 'singh'],
    ['ਕੁਮਾਰ', 'kumar'],
    ['ਰੁਪਏ', 'rupaye'],
    ['ਉਧਾਰ', 'udhaar'],
    ['ਖਾਤੇ ਵਿੱਚ', 'khaate vich'],
    ['ਦਰਜ ਹੋ ਗਿਆ', 'daraj ho gaya'],
    ['ਅਵਾਜ਼ ਸਾਫ਼ ਨਹੀਂ ਆਈ', 'awaaz saaf nahi aayi'],
    ['ਦੁਬਾਰਾ ਬੋਲੋ', 'dubara bolo'],
    ['ਅੱਜ ਦੀ ਕੁੱਲ ਵਿਕਰੀ', 'ajj di kul vikri'],
  ],
  gu: [
    ['માટે', 'maate'],
    ['ખોલવામાં આવી રહ્યો છે', 'kholvaama aavi rahyo chhe'],
    ['ખુલ્યું', 'khulyu'],
    ['તગાદો', 'tagaado'],
    ['કતારમાં', 'katar ma'],
    ['બાકી છે', 'baaki chhe'],
    ['બધા તગાદા પૂર્ણ થયા', 'badha tagaada poorna thaya'],
    ['રૂપિયા', 'rupiya'],
    ['ઉધાર', 'udhaar'],
    ['ખાતામાં નોંધાઈ ગયું', 'khaata ma nondhai gayu'],
    ['અવાજ સ્પષ્ટ નથી', 'awaaz spasht nathi'],
    ['ફરીથી બોલો', 'farithi bolo'],
  ],
  ta: [
    ['க்காக', 'kkaaga'],
    ['திறக்கப்படுகிறது', 'thirakkappadugiradhu'],
    ['திறக்கப்பட்டது', 'thirakkappattathu'],
    ['நினைவூட்டல்', 'reminder'],
    ['வரிசையில்', 'varisaiyil'],
    ['பேர் உள்ளனர்', 'per ullanar'],
    ['மீதம் உள்ளன', 'meedham ullana'],
    ['அனைத்தும் முடிந்தது', 'anaithum mudindhadhu'],
    ['ரூபாய்', 'roobai'],
    ['கடன்', 'kadan'],
    ['கணக்கில்', 'kanakkil'],
    ['பதிவு செய்யப்பட்டது', 'padhivu seyyappattathu'],
  ],
  te: [
    ['కోసం', 'koraku'],
    ['తెరవబడుతోంది', 'theravabaduthondi'],
    ['తెరవబడింది', 'theruvabadindi'],
    ['రిమైండర్', 'reminder'],
    ['క్యూలో', 'queue lo'],
    ['మంది మిగిలి ఉన్నారు', 'mandi migili vunnaru'],
    ['మిగిలి ఉన్నాయి', 'migili vunnayi'],
    ['అన్ని రిమైండర్‌లు పూర్తయ్యాయి', 'anni reminderlu poorthi ayyayi'],
    ['రూపాయలు', 'roopaayalu'],
    ['అప్పు', 'appu'],
    ['ఖాతాలో', 'khaata lo'],
    ['నమోదు చేయబడింది', 'namodu cheyabadindi'],
  ],
  hi: [
    ['के लिए', 'ke liye'],
    ['खोला जा रहा है', 'khola ja raha hai'],
    ['खोला गया', 'khola gaya'],
    ['तगादा', 'tagaada'],
    ['कतार में', 'kataar mein'],
    ['बाकी हैं', 'baaki hain'],
    ['बाकी है', 'baaki hai'],
    ['सभी तैयार हैं', 'sabhi taiyaar hain'],
    ['सभी पूरे हो गए', 'sabhi poore ho gaye'],
    ['रुपये', 'rupaye'],
    ['उधार', 'udhaar'],
    ['खाते में लिखें', 'khaate mein likhein'],
    ['दर्ज हो गया', 'daraj ho gaya'],
  ],
  bn: [
    ['এর জন্য', 'er jonno'],
    ['খোলা হয়েছে', 'khola hoyechhe'],
    ['খোলা হচ্ছে', 'khola hochhe'],
    ['তালিকায়', 'talikay'],
    ['বাকি আছে', 'baaki achhe'],
    ['সব শেষ হয়েছে', 'sob shesh hoyechhe'],
    ['টাকা', 'taka'],
    ['বাকি', 'baaki'],
  ],
  mr: [
    ['साठी', 'saathi'],
    ['उघडले गेले', 'ughadale gele'],
    ['उघडले जात आहे', 'ughadale jaat aahe'],
    ['रांगेत', 'ranget'],
    ['बाकी आहेत', 'baaki aahet'],
    ['सर्व पूर्ण झाले', 'sarva poorna zhaale'],
    ['रुपये', 'rupaye'],
    ['नोंदवले गेले', 'nondavale gele'],
  ],
  kn: [
    ['ಅವರಿಗಾಗಿ', 'avarigagi'],
    ['ತೆರೆಯಲಾಗಿದೆ', 'thereyalaagide'],
    ['ತೆರೆಯಲಾಗುತ್ತಿದೆ', 'thereyalaaguthide'],
    ['ಸಾಲಿನಲ್ಲಿ', 'saalinalli'],
    ['ಬಾಕಿ ಇದೆ', 'baaki ide'],
    ['ಎಲ್ಲವೂ ಪೂರ್ಣಗೊಂಡಿದೆ', 'ellavoo poornagondide'],
  ],
  ml: [
    ['ഇനായി', 'inayi'],
    ['തുറന്നു', 'thuranu'],
    ['തുറക്കുന്നു', 'thurakkunnu'],
    ['വരിയിൽ', 'variyil'],
    ['ബാക്കി ഉണ്ട്', 'baakki unde'],
    ['എല്ലാം പൂർത്തിയായി', 'ellam poorthiyaayi'],
  ],
};

/**
 * Converts any Indic text to Romanized phonetic script for clear pronunciation via English / Indian-English voices.
 */
export function indicToRomanPhonetic(text: string, lang: string): string {
  let res = text;
  const dict = INDIC_PHRASE_DICTIONARY[lang];
  if (dict) {
    for (const [k, v] of dict) {
      res = res.split(k).join(' ' + v + ' ');
    }
  }
  const deva = indicToDevanagari(res, lang);
  const roman = devanagariToRomanPhonetic(deva);
  return roman
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}

const LANG_NAME_KEYWORDS: Record<string, string[]> = {
  hi: ['hindi', 'kalpana', 'hemant'],
  pa: ['punjabi', 'panjabi', 'gurmukhi', 'harpreet'],
  gu: ['gujarati', 'dhwani', 'niranjan'],
  mr: ['marathi', 'aarohi', 'manohar'],
  bn: ['bengali', 'bangla', 'tapan', 'bashkar'],
  ta: ['tamil', 'valluvar'],
  te: ['telugu', 'chitra', 'mohan'],
  kn: ['kannada', 'gagan', 'sapna'],
  ml: ['malayalam', 'midhun', 'sobha'],
  en: ['english', 'heera', 'ravi', 'david', 'mark', 'zira'],
};

export type VoiceMode = 'native' | 'devanagari' | 'roman';

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

  resolveBestVoice(lang: string): {
    voice: SpeechSynthesisVoice | null;
    voiceLang: string;
    mode: VoiceMode;
  } {
    const voices = this.loadVoices();
    if (!voices || voices.length === 0) {
      return {
        voice: null,
        voiceLang: 'en-IN',
        mode: lang === 'en' ? 'native' : 'roman',
      };
    }

    const targetPrefix = lang.toLowerCase().slice(0, 2);
    const keywords = LANG_NAME_KEYWORDS[targetPrefix] || [];

    // 1. Direct match for target language (Native voice pack installed)
    const directVoice = voices.find((v) => {
      const vLang = v.lang.toLowerCase();
      const vName = v.name.toLowerCase();
      return (
        vLang.startsWith(targetPrefix) ||
        keywords.some((kw) => vName.includes(kw))
      );
    });
    if (directVoice) {
      return { voice: directVoice, voiceLang: directVoice.lang, mode: 'native' };
    }

    // 2. If target is an Indic language, check if a Hindi voice is installed (Devanagari transliteration)
    if (targetPrefix !== 'en') {
      const hindiVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('hi') ||
          v.name.toLowerCase().includes('hindi') ||
          v.name.toLowerCase().includes('kalpana')
      );
      if (hindiVoice) {
        return { voice: hindiVoice, voiceLang: hindiVoice.lang, mode: 'devanagari' };
      }
    }

    // 3. Indian English voice fallback (e.g. Microsoft Heera, Microsoft Ravi on Windows)
    // English voices cannot parse Indic Unicode glyphs, so we romanize phonetically
    const indianEngVoice = voices.find(
      (v) =>
        v.lang.toLowerCase() === 'en-in' ||
        v.name.toLowerCase().includes('india') ||
        v.name.toLowerCase().includes('ravi') ||
        v.name.toLowerCase().includes('heera')
    );
    if (indianEngVoice) {
      return {
        voice: indianEngVoice,
        voiceLang: indianEngVoice.lang,
        mode: targetPrefix === 'en' ? 'native' : 'roman',
      };
    }

    // 4. Any English voice (e.g. David, Mark, Zira)
    const engVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (engVoice) {
      return {
        voice: engVoice,
        voiceLang: engVoice.lang,
        mode: targetPrefix === 'en' ? 'native' : 'roman',
      };
    }

    // 5. First system voice fallback
    return {
      voice: voices[0],
      voiceLang: voices[0].lang,
      mode: targetPrefix === 'en' ? 'native' : 'roman',
    };
  }

  speak(
    text: string,
    lang: LanguageCode | string = 'hi',
    options?: { cloudSpeechEnabled?: boolean; shopId?: string }
  ): Promise<SpeakingProviderId> {
    return this.speakWithOrder(text, lang, options);
  }

  private preRecordedPack = new Map<string, string>();
  private activeAudio: HTMLAudioElement | null = null;
  private activeFetchController: AbortController | null = null;
  private inFlightTts = new Map<string, Promise<{ audioBase64: string; mimeType: string; latencyMs: number } | null>>();
  private ttsQueue: Promise<unknown> = Promise.resolve();
  private ttsCooldownUntilMs = 0;
  private speechEpoch = 0;
  private speakingState = false;
  private speakingListeners = new Set<(speaking: boolean) => void>();

  isSpeakingNow(): boolean {
    return this.speakingState;
  }

  subscribeSpeaking(listener: (speaking: boolean) => void): () => void {
    this.speakingListeners.add(listener);
    listener(this.speakingState);
    return () => {
      this.speakingListeners.delete(listener);
    };
  }

  private setSpeakingState(next: boolean): void {
    if (this.speakingState !== next) {
      this.speakingState = next;
      for (const cb of this.speakingListeners) {
        try {
          cb(next);
        } catch {}
      }
    }
  }

  registerPreRecordedPack(entries: Array<{ language: string; text: string; url: string }>): void {
    for (const e of entries) {
      this.preRecordedPack.set(`${e.language.slice(0, 2)}::${hashTTSText(e.text)}`, e.url);
    }
  }

  clearPreRecordedPackForTest(): void {
    this.preRecordedPack.clear();
    this.ttsCooldownUntilMs = 0;
  }

  private enqueueTtsFetch<T>(task: () => Promise<T>): Promise<T> {
    const next = this.ttsQueue.then(task);
    this.ttsQueue = next.catch(() => undefined);
    return next;
  }

  private async playBase64OrUrl(src: string, epoch: number): Promise<boolean> {
    if (typeof Audio === 'undefined' || epoch !== this.speechEpoch) return false;
    this.stopAudioOnly();
    return new Promise((resolve) => {
      try {
        const audio = new Audio(src);
        this.activeAudio = audio;
        let settled = false;
        const done = (ok: boolean) => {
          if (!settled) {
            settled = true;
            if (this.activeAudio === audio) {
              this.activeAudio = null;
            }
            resolve(ok);
          }
        };
        audio.onended = () => done(true);
        audio.onerror = () => done(false);
        setTimeout(() => done(true), 8000);
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => done(false));
        }
      } catch {
        resolve(false);
      }
    });
  }

  private stopAudioOnly(): void {
    if (this.activeFetchController) {
      try {
        this.activeFetchController.abort();
      } catch {}
      this.activeFetchController = null;
    }
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.src = '';
      } catch {}
      this.activeAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
    this.setSpeakingState(false);
  }

  private splitIntoSpeechChunks(text: string): string[] {
    const clean = text.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    if (clean.length <= 100) return [clean];
    const parts = clean
      .split(/(?<=[।.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 1) return [clean.slice(0, 500)];

    // Group short adjacent sentences up to ~160 chars for natural cadence without round-trip bloat
    const chunks: string[] = [];
    let current = '';
    for (const part of parts) {
      if (!current) {
        current = part;
      } else if (current.length + 1 + part.length <= 160) {
        current = `${current} ${part}`;
      } else {
        chunks.push(current);
        current = part;
      }
    }
    if (current) chunks.push(current);
    return chunks.map((c) => c.slice(0, 500));
  }

  private async fetchGnaniAudioChunk(
    chunkText: string,
    profile: ReturnType<typeof getLanguageVoiceProfile>,
    options?: { isPrewarm?: boolean; epoch?: number }
  ): Promise<{ audioBase64: string; mimeType: string; latencyMs: number; fallbackReason?: FallbackReason } | null> {
    const cacheParams = {
      language: profile.ttsLanguageCode,
      voice: profile.ttsVoice,
      model: profile.ttsModel,
      text: chunkText,
    };
    const cached = getCachedTTSAudio(cacheParams);
    if (cached) {
      return { audioBase64: cached.audioBase64, mimeType: cached.mimeType, latencyMs: 1 };
    }
    if (typeof fetch === 'undefined') return null;

    const dedupeKey = `${cacheParams.language}:${cacheParams.voice}:${cacheParams.model}:${hashTTSText(chunkText)}`;
    const existing = this.inFlightTts.get(dedupeKey);
    if (existing) {
      const joined = await existing;
      return joined ? { ...joined } : null;
    }

    const t0 = Date.now();
    const run = async (): Promise<{
      audioBase64: string;
      mimeType: string;
      latencyMs: number;
      fallbackReason?: FallbackReason;
    } | null> => {
      try {
        const endpoint =
          (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TTS_API_URL) || '/api/gnani-tts';
        let authToken = '';
        try {
          const { supabase } = await import('../lib/supabase');
          const { data } = await supabase.auth.getSession();
          authToken = data?.session?.access_token || '';
        } catch {
          authToken = '';
        }
        if (options?.epoch !== undefined && options.epoch !== this.speechEpoch) {
          return null;
        }

        const controller = new AbortController();
        if (!options?.isPrewarm) {
          this.activeFetchController = controller;
        }

        const res = await this.enqueueTtsFetch(() => {
          if (options?.epoch !== undefined && options.epoch !== this.speechEpoch) {
            return Promise.resolve(null);
          }
          return fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify(cacheParams),
            signal: controller.signal,
          });
        });

        if (this.activeFetchController === controller) {
          this.activeFetchController = null;
        }
        if (!res) return null;
        if (res.ok) {
          const data = (await res.json()) as {
            audioBase64?: string;
            mimeType?: string;
            latency?: number;
            costInr?: number;
          };
          if (data.audioBase64) {
            const mimeType = data.mimeType || 'audio/wav';
            setCachedTTSAudio(cacheParams, data.audioBase64, mimeType);
            const costInr =
              typeof data.costInr === 'number' ? data.costInr : estimateTtsCostInr(chunkText.length);
            const latencyMs = typeof data.latency === 'number' ? data.latency : Date.now() - t0;
            recordVoiceUsage({
              channel: 'tts',
              provider: 'gnani_tts',
              activeProviderLabel: 'gnani',
              latencyMs,
              costInr,
              fallbackReason: 'none',
            });
            return { audioBase64: data.audioBase64, mimeType, latencyMs };
          }
          return null;
        }

        if (res.status === 429) {
          this.ttsCooldownUntilMs = Date.now() + 15_000;
        }
        const reason: FallbackReason =
          res.status === 401
            ? 'http_401'
            : res.status === 402
            ? 'http_402'
            : res.status === 429
            ? 'http_429'
            : res.status >= 500
            ? 'http_5xx'
            : 'error';
        return { audioBase64: '', mimeType: '', latencyMs: Date.now() - t0, fallbackReason: reason };
      } catch (err: any) {
        const reason: FallbackReason = err?.name === 'AbortError' ? 'timeout' : 'error';
        return { audioBase64: '', mimeType: '', latencyMs: Date.now() - t0, fallbackReason: reason };
      }
    };

    const promise = run().finally(() => {
      this.inFlightTts.delete(dedupeKey);
    });
    this.inFlightTts.set(dedupeKey, promise);
    return promise;
  }

  /** Pre-warms Gnani TTS audio cache in the background for instant playback (e.g. Today's Summary). */
  async prewarm(
    text: string,
    lang: LanguageCode | string = 'hi',
    options?: { cloudSpeechEnabled?: boolean }
  ): Promise<void> {
    if (this.isMuted || !text) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const code = (lang || 'hi').slice(0, 2);
    const profile = getLanguageVoiceProfile(code);
    if (
      profile.ttsProvider !== 'gnani' ||
      options?.cloudSpeechEnabled === false ||
      isCloudSpeechKillSwitchActive() ||
      getRemainingVoiceBudgetInr() <= 0 ||
      Date.now() < this.ttsCooldownUntilMs
    ) {
      return;
    }
    const chunks = this.splitIntoSpeechChunks(text);
    if (chunks.length > 0) {
      await this.fetchGnaniAudioChunk(chunks[0], profile, { isPrewarm: true }).catch(() => undefined);
    }
  }

  /**
   * Provider order for speaking:
   * 1. Pre-recorded pack
   * 2. Configured cloud provider (Gnani / Timbre) with (language, voice, model, textHash) cache
   * 3. Device voice (Web Speech synthesis)
   * 4. Text only (silent resolve)
   */
  async speakWithOrder(
    text: string,
    lang: LanguageCode | string = 'hi',
    options?: { cloudSpeechEnabled?: boolean; shopId?: string }
  ): Promise<SpeakingProviderId> {
    if (this.isMuted || !text) {
      return 'text';
    }

    // Supersede any in-flight or active speech so two voices NEVER play together
    const myEpoch = ++this.speechEpoch;
    this.stopAudioOnly();
    this.setSpeakingState(true);

    const code = (lang || 'hi').slice(0, 2);
    const profile = getLanguageVoiceProfile(code);

    // 1. Pre-recorded pack
    const packUrl = this.preRecordedPack.get(`${code}::${hashTTSText(text)}`);
    if (packUrl) {
      const t0 = Date.now();
      const ok = await this.playBase64OrUrl(packUrl, myEpoch);
      if (myEpoch !== this.speechEpoch) return 'text';
      if (ok) {
        this.setSpeakingState(false);
        recordVoiceUsage({
          channel: 'tts',
          provider: 'device_tts',
          activeProviderLabel: 'pack',
          latencyMs: Date.now() - t0,
          costInr: 0,
        });
        return 'pack';
      }
    }

    // 2. Configured cloud provider (Gnani / Timbre) with chunked pipelining + cache
    const chunks = this.splitIntoSpeechChunks(text);
    let ttsFallbackReason: FallbackReason =
      profile.ttsProvider !== 'gnani'
        ? 'language_default'
        : options?.cloudSpeechEnabled === false
        ? 'cloud_disabled'
        : isCloudSpeechKillSwitchActive()
        ? 'kill_switch'
        : getRemainingVoiceBudgetInr() <= 0
        ? 'budget_exceeded'
        : Date.now() < this.ttsCooldownUntilMs
        ? 'http_429'
        : typeof navigator !== 'undefined' && navigator.onLine === false
        ? 'offline'
        : 'none';

    const allowCloud = ttsFallbackReason === 'none' && chunks.length > 0;

    if (allowCloud) {
      let allPlayed = true;
      let nextPrefetch: Promise<Awaited<ReturnType<SpeechSynthesizer['fetchGnaniAudioChunk']>>> | null = null;

      for (let i = 0; i < chunks.length; i++) {
        if (myEpoch !== this.speechEpoch) return 'text';
        const fetched = nextPrefetch
          ? await nextPrefetch
          : await this.fetchGnaniAudioChunk(chunks[i], profile, { epoch: myEpoch });
        nextPrefetch = null;

        if (myEpoch !== this.speechEpoch) return 'text';
        if (!fetched || !fetched.audioBase64) {
          if (fetched?.fallbackReason) ttsFallbackReason = fetched.fallbackReason;
          allPlayed = false;
          // If first chunk failed, fall back cleanly to device TTS for remaining text
          if (i === 0) break;
          // Otherwise speak remaining chunks with device voice
          const remainingText = chunks.slice(i).join(' ');
          if (this.synth && remainingText) {
            await this.speakWithDeviceSynth(remainingText, lang);
            if (myEpoch === this.speechEpoch) this.setSpeakingState(false);
            return 'device';
          }
          break;
        }

        // Pre-fetch next chunk while current chunk plays to eliminate inter-sentence lag
        if (i + 1 < chunks.length) {
          nextPrefetch = this.fetchGnaniAudioChunk(chunks[i + 1], profile, { epoch: myEpoch });
        }

        const ok = await this.playBase64OrUrl(`data:${fetched.mimeType};base64,${fetched.audioBase64}`, myEpoch);
        if (myEpoch !== this.speechEpoch) return 'text';
        if (!ok) {
          allPlayed = false;
          break;
        }
      }

      if (allPlayed) {
        if (myEpoch === this.speechEpoch) this.setSpeakingState(false);
        return 'gnani';
      }
    }

    if (myEpoch !== this.speechEpoch) {
      return 'text';
    }

    // 3. Device voice (Web Speech API)
    if (this.synth) {
      const t0 = Date.now();
      await this.speakWithDeviceSynth(text, lang);
      if (myEpoch === this.speechEpoch) this.setSpeakingState(false);
      recordVoiceUsage({
        channel: 'tts',
        provider: 'device_tts',
        activeProviderLabel: 'device',
        latencyMs: Date.now() - t0,
        costInr: 0,
        fallbackReason: ttsFallbackReason,
      });
      return 'device';
    }

    if (myEpoch === this.speechEpoch) this.setSpeakingState(false);
    // 4. Text only fallback
    return 'text';
  }

  private speakWithDeviceSynth(text: string, lang: LanguageCode | string = 'hi'): Promise<void> {
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

      const { voice, voiceLang, mode } = this.resolveBestVoice(lang);

      // Transform text according to available voice mode:
      // 'native'     -> Raw native script
      // 'devanagari' -> Transliterated to Devanagari for Hindi voice
      // 'roman'      -> Transliterated to Roman phonetics for English/Indian-English voice
      let spokenText = text;
      if (mode === 'devanagari') {
        spokenText = indicToDevanagari(text, lang);
      } else if (mode === 'roman') {
        spokenText = indicToRomanPhonetic(text, lang);
      }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = voice ? voice.lang : (voiceLang || 'en-IN');
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

      // Watchdog timeout to guarantee resolution
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
    this.speechEpoch++;
    this.stopAudioOnly();
  }
}

export const speechSynthesizer = new SpeechSynthesizer();
