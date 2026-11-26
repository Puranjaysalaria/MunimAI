import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ALLOWED_STT_MODELS,
  DEFAULT_UPSTREAM_TIMEOUT_MS,
  MAX_STT_BODY_BYTES,
  applyCorsAllowlist,
  isAllowedLanguageInput,
  isValidWav16kMonoHeader,
  mapGnaniLanguage,
  reconcileVoiceQuota,
  reserveVoiceQuota,
  resetAtomicFallbackQuotaForTest,
  verifySupabaseUserAndShop,
} from './_voiceShared.js';

const GNANI_STT_INR_PER_SEC = 0.015;

export function resetGnaniSttLimitsForTest(): void {
  resetAtomicFallbackQuotaForTest();
}

/** Treats transcript strictly as plain data (strips control characters). */
function sanitizeTranscriptData(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    return await handleGnaniStt(req, res);
  } catch {
    if (!res.headersSent) {
      res.status(503).json({ success: false, error: 'Service temporarily unavailable' });
    }
  }
}

async function handleGnaniStt(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!applyCorsAllowlist(req, res)) {
    res.status(403).json({ success: false, error: 'Origin not allowed' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Verify Supabase access token and derive shop_id from DB (never from request body)
  const auth = await verifySupabaseUserAndShop(req);
  if (!auth.ok || !auth.shopId) {
    res.status(auth.status).json({ success: false, error: 'Unauthorized' });
    return;
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    if (Buffer.byteLength(payload, 'utf8') > MAX_STT_BODY_BYTES * 1.4) {
      res.status(413).json({ success: false, error: 'Request body too large' });
      return;
    }
    try {
      payload = JSON.parse(payload);
    } catch {
      res.status(400).json({ success: false, error: 'Invalid request body' });
      return;
    }
  }
  payload = payload || {};

  const { audioBase64, language, model, hinglishMode, speechStartedAtMs } = payload as {
    audioBase64?: string;
    language?: string;
    model?: string;
    hinglishMode?: 'auto' | 'mixed' | 'off';
    speechStartedAtMs?: number;
  };

  if (!isAllowedLanguageInput(language)) {
    res.status(400).json({ success: false, error: 'Unsupported language' });
    return;
  }

  const chosenModel = (model || process.env.GNANI_STT_MODEL || 'prisma-v3.0').trim();
  if (!ALLOWED_STT_MODELS.has(chosenModel)) {
    res.status(400).json({ success: false, error: 'Unsupported model' });
    return;
  }

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    res.status(400).json({ success: false, error: 'Missing audio payload' });
    return;
  }

  const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
  const audioBuffer = Buffer.from(cleanBase64, 'base64');

  if (audioBuffer.length > MAX_STT_BODY_BYTES) {
    res.status(413).json({ success: false, error: 'Audio payload exceeds 1 MB limit' });
    return;
  }

  if (!isValidWav16kMonoHeader(audioBuffer)) {
    res.status(400).json({ success: false, error: 'Invalid audio format' });
    return;
  }

  const durationSec = Math.max(0.1, (audioBuffer.length - 44) / 32000);
  const estimatedInr = Number((durationSec * GNANI_STT_INR_PER_SEC).toFixed(6));

  const gnaniUrl = process.env.GNANI_STT_URL || '';
  const gnaniApiKey = process.env.GNANI_API_KEY || process.env.GNANI_ACCESS_KEY || '';
  const gnaniProductId = process.env.GNANI_PRODUCT_ID || '';

  if (!gnaniUrl || !gnaniApiKey) {
    res.status(503).json({ success: false, error: 'Speech service unavailable' });
    return;
  }

  // Reserve estimated cost atomically before calling Gnani (fail closed if quota check errors)
  const quota = await reserveVoiceQuota(auth, estimatedInr, 'stt');
  if (!quota.allowed) {
    res.status(quota.status).json({
      success: false,
      error: quota.status === 429 ? 'Rate limit exceeded' : 'Voice quota exceeded',
    });
    return;
  }

  const mappedLang = mapGnaniLanguage(language);
  const timeoutMs = Math.max(1000, Number(process.env.GNANI_UPSTREAM_TIMEOUT_MS) || DEFAULT_UPSTREAM_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();

  try {
    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });
    const targetLangCode =
      mappedLang === 'hi-IN' && hinglishMode === 'mixed' ? 'indic-auto' : mappedLang;
    formData.append('audio_file', audioBlob, 'command.wav');
    formData.append('language_code', targetLangCode);
    formData.append('model', chosenModel);

    const headers: Record<string, string> = {
      'X-API-Key-ID': gnaniApiKey,
    };
    if (gnaniProductId) {
      headers['x-product-id'] = gnaniProductId;
    }

    const upstream = await fetch(gnaniUrl, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const latency = Date.now() - t0;

    if (!upstream.ok) {
      await reconcileVoiceQuota(auth, quota.reservationId, 0);
      // Parse any of Gnani's 3 error body shapes internally without leaking upstream internals
      await upstream.json().catch(() => null);
      const statusMap: Record<number, { status: number; error: string }> = {
        401: { status: 502, error: 'Speech service authentication failed' },
        402: { status: 402, error: 'Voice quota exceeded' },
        422: { status: 400, error: 'Unsupported audio or language parameters' },
        429: { status: 429, error: 'Rate limit exceeded' },
        504: { status: 504, error: 'Speech recognition timed out' },
      };
      const mapped = statusMap[upstream.status] || {
        status: 502,
        error: 'Speech recognition unavailable',
      };
      res.status(mapped.status).json({ success: false, error: mapped.error });
      return;
    }

    const data = (await upstream.json()) as {
      transcript?: unknown;
      text?: unknown;
      confidence?: unknown;
    };

    const transcript = sanitizeTranscriptData(data.transcript ?? data.text);
    const confidence =
      typeof data.confidence === 'number' && Number.isFinite(data.confidence)
        ? data.confidence
        : undefined;

    await reconcileVoiceQuota(auth, quota.reservationId, estimatedInr);
    res.status(200).json({
      success: true,
      provider: 'gnani',
      model: chosenModel,
      language: mappedLang,
      transcript,
      ...(confidence !== undefined ? { confidence } : {}),
      latency,
      costInr: estimatedInr,
      speechStartedAtMs,
    });
  } catch (err: any) {
    clearTimeout(timer);
    await reconcileVoiceQuota(auth, quota.reservationId, 0);
    const isTimeout = err?.name === 'AbortError';
    res.status(isTimeout ? 504 : 502).json({
      success: false,
      error: isTimeout ? 'Speech recognition timed out' : 'Speech recognition failed',
    });
  }
}
