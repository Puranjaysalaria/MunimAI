import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

export const MAX_STT_BODY_BYTES = 1024 * 1024; // 1 MB
export const DEFAULT_TTS_MAX_CHARS = 500;
export const DEFAULT_UPSTREAM_TIMEOUT_MS = 8_000;

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

/**
 * Enforces ALLOWED_ORIGINS allowlist (fail closed — never emits Access-Control-Allow-Origin: *).
 */
export function applyCorsAllowlist(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers?.origin;
  const rawAllowed = process.env.ALLOWED_ORIGINS || '';
  const allowlist = rawAllowed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (!origin) {
    // Non-browser / same-origin server call without Origin header
    return allowlist.length === 0 ? true : true;
  }

  if (allowlist.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    return true;
  }

  return false;
}

export interface VerifiedVoiceAuth {
  ok: boolean;
  status: number;
  userId?: string;
  shopId?: string;
  token?: string;
}

export type VoiceAuthVerifier = (token: string) => Promise<VerifiedVoiceAuth>;

let customVoiceAuthVerifier: VoiceAuthVerifier | null = null;

export function setVoiceAuthVerifierForTest(verifier: VoiceAuthVerifier | null): void {
  customVoiceAuthVerifier = verifier;
}

/**
 * Verifies the Supabase access token server-side via supabase.auth.getUser(token)
 * and derives shop_id from the verified user in the database (never from request body).
 * Fails closed when token, Supabase env, or user-shop mapping is missing.
 */
export async function verifySupabaseUserAndShop(req: VercelRequest): Promise<VerifiedVoiceAuth> {
  const authHeader = (req.headers?.authorization || '').trim();
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return { ok: false, status: 401 };
  }

  if (customVoiceAuthVerifier) {
    return customVoiceAuthVerifier(token);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder')) {
    return { ok: false, status: 503 };
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return { ok: false, status: 401 };
    }

    const userId = userData.user.id;
    const { data: userRow, error: shopErr } = await supabase
      .from('users')
      .select('shop_id')
      .eq('id', userId)
      .single();

    if (shopErr || !userRow?.shop_id) {
      return { ok: false, status: 403 };
    }

    return { ok: true, status: 200, userId, shopId: userRow.shop_id, token };
  } catch {
    return { ok: false, status: 401 };
  }
}
