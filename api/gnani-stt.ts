import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isValidWav16kMonoHeader, mapGnaniLanguage } from './stt-gnani';

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 30;
const DEFAULT_DAILY_BUDGET_INR = 100;
const GNANI_STT_INR_PER_SEC = 0.015;

const requestBuckets = new Map<string, { count: number; windowStart: number }>();
const dailySpendByShop = new Map<string, number>();

export function resetGnaniSttLimitsForTest(): void {
  requestBuckets.clear();
  dailySpendByShop.clear();
}

function checkAuth(req: VercelRequest): { ok: boolean; shopId: string } {
  const shopId = ((req.headers['x-shop-id'] as string) || 'default-shop').trim();
  const requiredSecret = process.env.INTERNAL_STT_SECRET || '';
  if (!requiredSecret) {
    return { ok: true, shopId };
  }
  const auth = (req.headers.authorization || '').trim();
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth;
  return { ok: token === requiredSecret, shopId };
}

function checkRateLimit(shopId: string, nowMs: number = Date.now()): boolean {
  const maxReqs = Math.max(1, Number(process.env.GNANI_STT_RPM) || DEFAULT_RATE_LIMIT_MAX);
  const bucket = requestBuckets.get(shopId);
  if (!bucket || nowMs - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    requestBuckets.set(shopId, { count: 1, windowStart: nowMs });
    return true;
  }
  if (bucket.count >= maxReqs) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function getSpendKey(shopId: string): string {
  return `${shopId}:${new Date().toISOString().slice(0, 10)}`;
}

function checkAndRecordBudget(shopId: string, estimatedInr: number): { allowed: boolean; remainingInr: number } {
  const cap = Math.max(0, Number(process.env.GNANI_DAILY_BUDGET_INR) || DEFAULT_DAILY_BUDGET_INR);
  const key = getSpendKey(shopId);
  const used = dailySpendByShop.get(key) || 0;
  if (used + estimatedInr > cap) {
    return { allowed: false, remainingInr: Math.max(0, cap - used) };
  }
  dailySpendByShop.set(key, used + estimatedInr);
  return { allowed: true, remainingInr: Math.max(0, cap - (used + estimatedInr)) };
}

/** Treats transcript strictly as plain data (strips control characters). */
function sanitizeTranscriptData(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-shop-id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const auth = checkAuth(req);
  if (!auth.ok) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  if (!checkRateLimit(auth.shopId)) {
    res.status(429).json({ success: false, error: 'Rate limit exceeded for gnani-stt' });
    return;
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      res.status(400).json({ success: false, error: 'Invalid JSON body' });
      return;
    }
  }
  payload = payload || {};

  const {
    audioBase64,
    language,
    model,
    hinglishMode,
    speechStartedAtMs,
  } = payload as {
    audioBase64?: string;
    language?: string;
    model?: string;
    hinglishMode?: 'auto' | 'mixed' | 'off';
    speechStartedAtMs?: number;
  };

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    res.status(400).json({ success: false, error: 'Missing audioBase64', speechStartedAtMs });
    return;
  }

  const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
  const audioBuffer = Buffer.from(cleanBase64, 'base64');

  if (!isValidWav16kMonoHeader(audioBuffer)) {
    res.status(400).json({
      success: false,
      error: 'Audio must be 16 kHz mono 16-bit PCM WAV.',
      speechStartedAtMs,
    });
    return;
  }

  // Compute clip duration from PCM payload bytes (16kHz * 2 bytes/sample = 32,000 bytes/sec)
  const durationSec = Math.max(0.1, (audioBuffer.length - 44) / 32000);
  const estimatedInr = Number((durationSec * GNANI_STT_INR_PER_SEC).toFixed(6));
  const budget = checkAndRecordBudget(auth.shopId, estimatedInr);
  if (!budget.allowed) {
    res.status(402).json({
      success: false,
      error: 'Daily Gnani STT budget exceeded',
      remainingInr: budget.remainingInr,
      speechStartedAtMs,
    });
    return;
  }

  const gnaniUrl = process.env.GNANI_STT_URL || '';
  const gnaniApiKey = process.env.GNANI_API_KEY || process.env.GNANI_ACCESS_KEY || '';
  const gnaniProductId = process.env.GNANI_PRODUCT_ID || '';

  if (!gnaniUrl || !gnaniApiKey) {
    res.status(503).json({
      success: false,
      error: 'Gnani STT credentials not configured on server',
      speechStartedAtMs,
    });
    return;
  }

  const mappedLang = mapGnaniLanguage(language);
  const chosenModel = (model || process.env.GNANI_STT_MODEL || 'gnani-stt-v2').trim();
  const t0 = Date.now();

  try {
    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });
    formData.append('audio', audioBlob, 'command.wav');
    formData.append('lang', mappedLang);
    formData.append('model', chosenModel);
    formData.append('encoding', 'pcm16');
    formData.append('sample_rate', '16000');

    // Only attach Hinglish auto/mixed option when explicitly requested & supported
    if (hinglishMode === 'auto' || hinglishMode === 'mixed') {
      formData.append('mixed_language', hinglishMode);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${gnaniApiKey}`,
      'x-api-key': gnaniApiKey,
    };
    if (gnaniProductId) {
      headers['x-product-id'] = gnaniProductId;
    }

    const upstream = await fetch(gnaniUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    const latency = Date.now() - t0;

    if (!upstream.ok) {
      res.status(upstream.status === 429 ? 429 : 502).json({
        success: false,
        error: `Gnani STT HTTP ${upstream.status}`,
        latency,
        speechStartedAtMs,
      });
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
    res.status(502).json({
      success: false,
      error: err?.message || 'Gnani STT request failed',
      latency: Date.now() - t0,
      speechStartedAtMs,
    });
  }
}
