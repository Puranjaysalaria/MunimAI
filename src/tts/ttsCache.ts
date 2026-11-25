/**
 * Persistent & in-memory TTS audio cache keyed by (language, voice, model, textHash).
 * Guarantees the same sentence is never synthesized twice by a remote TTS API.
 */

export interface TTSCacheKeyParams {
  language: string;
  voice: string;
  model: string;
  text: string;
}

export interface TTSCacheEntry {
  key: string;
  audioBase64: string;
  mimeType: string;
  createdAt: string;
}

const STORAGE_PREFIX = 'munim_tts_cache_v1:';
const memoryCache = new Map<string, TTSCacheEntry>();

/**
 * Deterministic FNV-1a 64-bit style hex hash of normalized text (sync, zero dependencies).
 */
export function hashTTSText(text: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch ^ (i & 0xff);
    h2 = Math.imul(h2, 0x01000193);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export function buildTTSCacheKey(params: TTSCacheKeyParams): string {
  const lang = params.language.trim().toLowerCase();
  const voice = params.voice.trim().toLowerCase();
  const model = params.model.trim().toLowerCase();
  const textHash = hashTTSText(params.text);
  return `${lang}::${voice}::${model}::${textHash}`;
}

export function getCachedTTSAudio(params: TTSCacheKeyParams): TTSCacheEntry | null {
  const key = buildTTSCacheKey(params);
  const mem = memoryCache.get(key);
  if (mem) return mem;

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (raw) {
        const parsed = JSON.parse(raw) as TTSCacheEntry;
        memoryCache.set(key, parsed);
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }

  return null;
}

export function setCachedTTSAudio(
  params: TTSCacheKeyParams,
  audioBase64: string,
  mimeType: string = 'audio/wav'
): TTSCacheEntry {
  const key = buildTTSCacheKey(params);
  const entry: TTSCacheEntry = {
    key,
    audioBase64,
    mimeType,
    createdAt: new Date().toISOString(),
  };
  memoryCache.set(key, entry);

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    }
  } catch {
    // Quota exceeded or unavailable — memory cache still holds the entry
  }

  return entry;
}

export function clearTTSCacheForTest(): void {
  memoryCache.clear();
  try {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    // ignore
  }
}
