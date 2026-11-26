import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getQuotaServiceRoleClient } from './_quotaServiceClient.js';

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
export const ALLOWED_STT_MODELS = new Set(['prisma-v2.5', 'prisma-v3.0']);
export const ALLOWED_TTS_MODELS = new Set(['timbre-v2.5', 'timbre-v3.0']);
export const ALLOWED_TTS_VOICES = new Set(['Nalini', 'Kaveri']);

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
  const rawOrigin = req.headers?.origin;
  const origin = typeof rawOrigin === 'string' ? rawOrigin.trim().replace(/\/+$/, '') : undefined;
  const rawAllowed = process.env.ALLOWED_ORIGINS || '';
  const allowlist = rawAllowed
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (!origin) {
    // Non-browser / server call without Origin header
    return true;
  }

  // Always allow same-origin requests (e.g. https://munim-ai-sepia.vercel.app -> /api/gnani-stt)
  const rawHost = req.headers?.['x-forwarded-host'] || req.headers?.host || '';
  const host = (Array.isArray(rawHost) ? rawHost[0] : rawHost).split(',')[0].trim();
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    return true;
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

export interface QuotaCheckResult {
  allowed: boolean;
  status: number;
  reason?: string;
  reservationId?: string;
}

export interface VoiceQuotaAdapter {
  reserve(params: {
    auth: VerifiedVoiceAuth;
    kind: 'stt' | 'tts';
    estimatedInr: number;
    shopDailyCap: number;
    shopMonthlyCap: number;
    globalMonthlyCap: number;
    globalRpm: number;
  }): Promise<QuotaCheckResult>;
  reconcile(params: {
    auth: VerifiedVoiceAuth;
    reservationId: string;
    actualInr: number;
  }): Promise<void>;
}

let customVoiceQuotaAdapter: VoiceQuotaAdapter | null = null;

export function setVoiceQuotaAdapterForTest(adapter: VoiceQuotaAdapter | null): void {
  customVoiceQuotaAdapter = adapter;
}

const atomicFallbackState = {
  shopDaily: new Map<string, number>(),
  shopMonthly: new Map<string, number>(),
  globalMonthly: new Map<string, number>(),
  globalRpm: { minute: '', count: 0 },
  reservations: new Map<string, { shopId: string; reservedInr: number; status: 'reserved' | 'settled' }>(),
  seq: 0,
};

export function resetAtomicFallbackQuotaForTest(): void {
  atomicFallbackState.shopDaily.clear();
  atomicFallbackState.shopMonthly.clear();
  atomicFallbackState.globalMonthly.clear();
  atomicFallbackState.globalRpm = { minute: '', count: 0 };
  atomicFallbackState.reservations.clear();
  atomicFallbackState.seq = 0;
}

function getIstDayAndMonth(): { day: string; month: string; minute: string } {
  const istMs = Date.now() + 330 * 60 * 1000;
  const istIso = new Date(istMs).toISOString();
  return {
    day: istIso.slice(0, 10),
    month: istIso.slice(0, 7),
    minute: istIso.slice(0, 16),
  };
}

export async function reserveVoiceQuota(
  auth: VerifiedVoiceAuth,
  estimatedInr: number,
  kind: 'stt' | 'tts' = 'stt'
): Promise<QuotaCheckResult> {
  if (!auth.shopId || !Number.isFinite(estimatedInr) || estimatedInr <= 0 || estimatedInr > 1000) {
    return { allowed: false, status: 400, reason: 'invalid_quota_args' };
  }

  const shopDailyCap = Math.max(0, Number(process.env.GNANI_DAILY_BUDGET_INR) || 5);
  const shopMonthlyCap = Math.max(0, Number(process.env.GNANI_MONTHLY_BUDGET_INR) || 50);
  const globalMonthlyCap = Math.max(0, Number(process.env.GNANI_GLOBAL_MONTHLY_BUDGET_INR) || 200);
  const globalRpm = Math.max(1, Number(process.env.GNANI_GLOBAL_RPM) || 50);

  if (customVoiceQuotaAdapter) {
    return customVoiceQuotaAdapter.reserve({
      auth,
      kind,
      estimatedInr,
      shopDailyCap,
      shopMonthlyCap,
      globalMonthlyCap,
      globalRpm,
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const serviceClient = getQuotaServiceRoleClient();
  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    if (!serviceClient) {
      // Fail closed if SUPABASE_SERVICE_ROLE_KEY is missing
      return { allowed: false, status: 503, reason: 'service_role_missing' };
    }
    try {
      const { data, error } = await serviceClient.rpc('reserve_voice_quota', {
        p_shop_id: auth.shopId,
        p_provider: 'gnani',
        p_kind: kind,
        p_estimated_inr: estimatedInr,
        p_shop_daily_cap: shopDailyCap,
        p_shop_monthly_cap: shopMonthlyCap,
        p_global_monthly_cap: globalMonthlyCap,
        p_global_rpm: globalRpm,
      });
      if (error || !data || !Array.isArray(data) || data.length === 0) {
        return { allowed: false, status: 503, reason: 'quota_error' };
      }
      const row = data[0] as { allowed: boolean; reason?: string; reservation_id?: string };
      if (!row.allowed) {
        const status = row.reason === 'global_rate_limit' ? 429 : 402;
        return { allowed: false, status, reason: row.reason };
      }
      return { allowed: true, status: 200, reason: 'ok', reservationId: row.reservation_id };
    } catch {
      return { allowed: false, status: 503, reason: 'quota_error' };
    }
  }

  // Fallback atomic check for non-Supabase unit test mocks
  const shopId = auth.shopId;
  const { day, month, minute } = getIstDayAndMonth();

  if (atomicFallbackState.globalRpm.minute !== minute) {
    atomicFallbackState.globalRpm = { minute, count: 0 };
  }
  if (atomicFallbackState.globalRpm.count + 1 > globalRpm) {
    return { allowed: false, status: 429, reason: 'global_rate_limit' };
  }
  const gUsed = atomicFallbackState.globalMonthly.get(month) || 0;
  if (gUsed + estimatedInr > globalMonthlyCap) {
    return { allowed: false, status: 402, reason: 'global_monthly_budget' };
  }
  const sDayKey = `${shopId}:${day}`;
  const sMonKey = `${shopId}:${month}`;
  const sDayUsed = atomicFallbackState.shopDaily.get(sDayKey) || 0;
  const sMonUsed = atomicFallbackState.shopMonthly.get(sMonKey) || 0;
  if (sDayUsed + estimatedInr > shopDailyCap) {
    return { allowed: false, status: 402, reason: 'shop_daily_budget' };
  }
  if (sMonUsed + estimatedInr > shopMonthlyCap) {
    return { allowed: false, status: 402, reason: 'shop_monthly_budget' };
  }

  atomicFallbackState.globalRpm.count += 1;
  atomicFallbackState.globalMonthly.set(month, gUsed + estimatedInr);
  atomicFallbackState.shopDaily.set(sDayKey, sDayUsed + estimatedInr);
  atomicFallbackState.shopMonthly.set(sMonKey, sMonUsed + estimatedInr);
  const reservationId = `res-${++atomicFallbackState.seq}`;
  atomicFallbackState.reservations.set(reservationId, { shopId, reservedInr: estimatedInr, status: 'reserved' });
  return { allowed: true, status: 200, reason: 'ok', reservationId };
}

export async function reconcileVoiceQuota(
  auth: VerifiedVoiceAuth,
  reservationId: string | undefined,
  actualInr: number
): Promise<void> {
  if (!auth.shopId || !reservationId || !Number.isFinite(actualInr) || actualInr < 0) return;

  if (customVoiceQuotaAdapter) {
    await customVoiceQuotaAdapter.reconcile({ auth, reservationId, actualInr });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const serviceClient = getQuotaServiceRoleClient();
  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    if (!serviceClient) return;
    try {
      await serviceClient.rpc('reconcile_voice_quota', {
        p_reservation_id: reservationId,
        p_shop_id: auth.shopId,
        p_actual_inr: actualInr,
      });
    } catch {
      // ignore reconciliation network errors
    }
    return;
  }

  const existing = atomicFallbackState.reservations.get(reservationId);
  if (!existing || existing.shopId !== auth.shopId || existing.status !== 'reserved') return;
  existing.status = 'settled';

  const clampedActual = Math.min(existing.reservedInr, Math.max(0, actualInr));
  const refund = existing.reservedInr - clampedActual;
  if (refund <= 0) return;

  const { day, month } = getIstDayAndMonth();
  const sDayKey = `${auth.shopId}:${day}`;
  const sMonKey = `${auth.shopId}:${month}`;
  atomicFallbackState.shopDaily.set(sDayKey, Math.max(0, (atomicFallbackState.shopDaily.get(sDayKey) || 0) - refund));
  atomicFallbackState.shopMonthly.set(sMonKey, Math.max(0, (atomicFallbackState.shopMonthly.get(sMonKey) || 0) - refund));
  atomicFallbackState.globalMonthly.set(month, Math.max(0, (atomicFallbackState.globalMonthly.get(month) || 0) - refund));
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
    const serviceClient = getQuotaServiceRoleClient();
    const lookupClient = serviceClient || supabase;
    const { data: userRow, error: shopErr } = await lookupClient
      .from('users')
      .select('shop_id')
      .eq('id', userId)
      .maybeSingle();

    if (userRow?.shop_id) {
      return { ok: true, status: 200, userId, shopId: userRow.shop_id, token };
    }

    // If user is authenticated via Supabase Auth but has no users/shops row yet, provision it server-side
    if (serviceClient) {
      const newShopId = crypto.randomUUID();
      const meta = (userData.user.user_metadata || {}) as Record<string, string>;
      const uniquePhone =
        userData.user.phone ||
        `+919${String(Math.floor(100000000 + Math.random() * 900000000))}`;
      const { error: createShopErr } = await serviceClient.from('shops').insert({
        id: newShopId,
        name: meta.shop_name || 'My Shop',
        owner_phone: uniquePhone,
      });
      if (!createShopErr) {
        const { error: createUserErr } = await serviceClient.from('users').insert({
          id: userId,
          shop_id: newShopId,
          name: meta.owner_name || userData.user.email?.split('@')[0] || 'Shop Owner',
          phone: uniquePhone,
          role: 'owner',
        });
        if (!createUserErr) {
          return { ok: true, status: 200, userId, shopId: newShopId, token };
        }
      }
    }

    if (shopErr || !userRow?.shop_id) {
      return { ok: false, status: 403 };
    }

    return { ok: true, status: 200, userId, shopId: userRow.shop_id, token };
  } catch {
    return { ok: false, status: 401 };
  }
}
