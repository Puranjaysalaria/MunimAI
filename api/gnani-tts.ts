import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ALLOWED_TTS_MODELS,
  ALLOWED_TTS_VOICES,
  DEFAULT_TTS_MAX_CHARS,
  DEFAULT_UPSTREAM_TIMEOUT_MS,
  applyCorsAllowlist,
  isAllowedLanguageInput,
  mapGnaniLanguage,
  verifySupabaseUserAndShop,
} from './_voiceShared';

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

function checkAndRecordBudget(shopId: string, estimatedInr: number): { allowed: boolean } {
  const cap = Math.max(0, Number(process.env.GNANI_DAILY_BUDGET_INR) || DEFAULT_DAILY_BUDGET_INR);
  const key = `${shopId}:${new Date().toISOString().slice(0, 10)}`;
  const used = dailySpendByShop.get(key) || 0;
  if (used + estimatedInr > cap) return { allowed: false };
  dailySpendByShop.set(key, used + estimatedInr);
  return { allowed: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
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

  const auth = await verifySupabaseUserAndShop(req);
  if (!auth.ok || !auth.shopId) {
    res.status(auth.status).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const shopId = auth.shopId;
  if (!checkRateLimit(shopId)) {
    res.status(429).json({ success: false, error: 'Rate limit exceeded' });
    return;
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      res.status(400).json({ success: false, error: 'Invalid request body' });
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

  if (!isAllowedLanguageInput(language)) {
    res.status(400).json({ success: false, error: 'Unsupported language' });
    return;
  }

  const chosenModel = (model || process.env.TIMBRE_TTS_MODEL || 'timbre-v1').trim();
  if (!ALLOWED_TTS_MODELS.has(chosenModel)) {
    res.status(400).json({ success: false, error: 'Unsupported model' });
    return;
  }

  const chosenVoice = (voice || process.env.TIMBRE_TTS_VOICE || 'ananya').trim();
  if (!ALLOWED_TTS_VOICES.has(chosenVoice)) {
    res.status(400).json({ success: false, error: 'Unsupported voice' });
    return;
  }

  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ success: false, error: 'Missing text payload' });
    return;
  }

  const maxChars = Math.max(1, Number(process.env.GNANI_TTS_MAX_CHARS) || DEFAULT_TTS_MAX_CHARS);
  const cleanText = text.trim();
  if (cleanText.length > maxChars) {
    res.status(413).json({ success: false, error: `Text exceeds ${maxChars} character limit` });
    return;
  }

  const estimatedInr = Number((cleanText.length * GNANI_TTS_INR_PER_CHAR).toFixed(6));
  const budget = checkAndRecordBudget(shopId, estimatedInr);
  if (!budget.allowed) {
    res.status(402).json({ success: false, error: 'Voice quota exceeded' });
    return;
  }

  const timbreUrl = process.env.TIMBRE_TTS_URL || process.env.GNANI_TTS_URL || '';
  const apiKey = process.env.GNANI_API_KEY || process.env.TIMBRE_API_KEY || '';

  if (!timbreUrl || !apiKey) {
    res.status(503).json({ success: false, error: 'Speech service unavailable' });
    return;
  }

  const mappedLang = mapGnaniLanguage(language);
  const timeoutMs = Math.max(1000, Number(process.env.GNANI_UPSTREAM_TIMEOUT_MS) || DEFAULT_UPSTREAM_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
      signal: controller.signal,
    });
    clearTimeout(timer);

    const latency = Date.now() - t0;

    if (!upstream.ok) {
      res.status(upstream.status === 429 ? 429 : 502).json({
        success: false,
        error: upstream.status === 429 ? 'Rate limit exceeded' : 'Speech synthesis unavailable',
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
    clearTimeout(timer);
    const isTimeout = err?.name === 'AbortError';
    res.status(isTimeout ? 504 : 502).json({
      success: false,
      error: isTimeout ? 'Speech synthesis timed out' : 'Speech synthesis failed',
    });
  }
}
