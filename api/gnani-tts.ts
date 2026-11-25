import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapGnaniLanguage } from './stt-gnani';

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 40;
const DEFAULT_DAILY_BUDGET_INR = 100;
const GNANI_TTS_INR_PER_CHAR = 0.0005;

const requestBuckets = new Map<string, { count: number; windowStart: number }>();
const dailySpendByShop = new Map<string, number>();

export function resetGnaniTtsLimitsForTest(): void {
  requestBuckets.clear();
  dailySpendByShop.clear();
}

function checkAuth(req: VercelRequest): { ok: boolean; shopId: string } {
  const shopId = ((req.headers['x-shop-id'] as string) || 'default-shop').trim();
  const requiredSecret = process.env.INTERNAL_TTS_SECRET || '';
  if (!requiredSecret) return { ok: true, shopId };
  const auth = (req.headers.authorization || '').trim();
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth;
  return { ok: token === requiredSecret, shopId };
}

function checkRateLimit(shopId: string, nowMs: number = Date.now()): boolean {
  const maxReqs = Math.max(1, Number(process.env.GNANI_TTS_RPM) || DEFAULT_RATE_LIMIT_MAX);
  const bucket = requestBuckets.get(shopId);
  if (!bucket || nowMs - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    requestBuckets.set(shopId, { count: 1, windowStart: nowMs });
    return true;
  }
  if (bucket.count >= maxReqs) return false;
  bucket.count += 1;
  return true;
}

function checkAndRecordBudget(shopId: string, estimatedInr: number): { allowed: boolean; remainingInr: number } {
  const cap = Math.max(0, Number(process.env.GNANI_DAILY_BUDGET_INR) || DEFAULT_DAILY_BUDGET_INR);
  const key = `${shopId}:${new Date().toISOString().slice(0, 10)}`;
  const used = dailySpendByShop.get(key) || 0;
  if (used + estimatedInr > cap) {
    return { allowed: false, remainingInr: Math.max(0, cap - used) };
  }
  dailySpendByShop.set(key, used + estimatedInr);
  return { allowed: true, remainingInr: Math.max(0, cap - (used + estimatedInr)) };
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
    res.status(429).json({ success: false, error: 'Rate limit exceeded for gnani-tts' });
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

  const { text, language, voice, model } = payload as {
    text?: string;
    language?: string;
    voice?: string;
    model?: string;
  };

  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ success: false, error: 'Missing text in request body' });
    return;
  }

  const cleanText = text.trim().slice(0, 1000);
  const estimatedInr = Number((cleanText.length * GNANI_TTS_INR_PER_CHAR).toFixed(6));
  const budget = checkAndRecordBudget(auth.shopId, estimatedInr);
  if (!budget.allowed) {
    res.status(402).json({
      success: false,
      error: 'Daily Gnani TTS budget exceeded',
      remainingInr: budget.remainingInr,
    });
    return;
  }

  const timbreUrl = process.env.TIMBRE_TTS_URL || process.env.GNANI_TTS_URL || '';
  const apiKey = process.env.GNANI_API_KEY || process.env.TIMBRE_API_KEY || '';

  if (!timbreUrl || !apiKey) {
    res.status(503).json({
      success: false,
      error: 'Timbre/Gnani TTS credentials not configured on server',
    });
    return;
  }

  const mappedLang = mapGnaniLanguage(language);
  const chosenModel = (model || process.env.TIMBRE_TTS_MODEL || 'timbre-v1').trim();
  const chosenVoice = (voice || process.env.TIMBRE_TTS_VOICE || 'ananya').trim();
  const t0 = Date.now();

  try {
    const upstream = await fetch(timbreUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        text: cleanText,
        language: mappedLang,
        voice: chosenVoice,
        model: chosenModel,
        format: 'wav',
      }),
    });

    const latency = Date.now() - t0;

    if (!upstream.ok) {
      res.status(upstream.status === 429 ? 429 : 502).json({
        success: false,
        error: `Timbre TTS HTTP ${upstream.status}`,
        latency,
      });
      return;
    }

    const contentType = upstream.headers.get('content-type') || '';
    let audioBase64 = '';
    let mimeType = 'audio/wav';

    if (contentType.includes('application/json')) {
      const data = (await upstream.json()) as { audioBase64?: string; audio?: string; mimeType?: string };
      audioBase64 = data.audioBase64 || data.audio || '';
      mimeType = data.mimeType || 'audio/wav';
    } else {
      const arrBuf = await upstream.arrayBuffer();
      audioBase64 = Buffer.from(arrBuf).toString('base64');
      if (contentType.startsWith('audio/')) {
        mimeType = contentType;
      }
    }

    res.status(200).json({
      success: true,
      provider: 'gnani',
      model: chosenModel,
      voice: chosenVoice,
      language: mappedLang,
      audioBase64,
      mimeType,
      charCount: cleanText.length,
      costInr: estimatedInr,
      latency,
    });
  } catch (err: any) {
    res.status(502).json({
      success: false,
      error: err?.message || 'Timbre TTS request failed',
      latency: Date.now() - t0,
    });
  }
}
