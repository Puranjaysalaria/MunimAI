export const LANGUAGE_MAP: Record<string, string> = {
  hi: 'hi-IN',
  'hi-IN': 'hi-IN',
  en: 'en-IN',
  'en-IN': 'en-IN',
  pa: 'pa-IN',
  'pa-IN': 'pa-IN',
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

export const ALLOWED_LANGUAGES = new Set(Object.values(LANGUAGE_MAP));
export const ALLOWED_STT_MODELS = new Set(['gnani-stt-v2']);
export const ALLOWED_TTS_MODELS = new Set(['timbre-v1']);
export const ALLOWED_TTS_VOICES = new Set([
  'ananya',
  'kavya',
  'simran',
  'diya',
  'sai',
  'roshni',
  'nithya',
  'sri',
  'ananya-kn',
  'lekha',
]);

export function mapGnaniLanguage(lang?: string): string {
  return LANGUAGE_MAP[(lang || 'hi').trim()] || 'hi-IN';
}

export function isAllowedLanguageInput(lang?: string): boolean {
  if (!lang) return true;
  return Boolean(LANGUAGE_MAP[lang.trim()]);
}

export function isValidWav16kMonoHeader(buffer: Buffer): boolean {
  if (buffer.length < 44) return false;
  const riff = buffer.toString('ascii', 0, 4);
  const wave = buffer.toString('ascii', 8, 12);
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  return riff === 'RIFF' && wave === 'WAVE' && channels === 1 && sampleRate === 16000 && bitsPerSample === 16;
}
