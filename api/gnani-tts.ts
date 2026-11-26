import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ALLOWED_TTS_MODELS,
  ALLOWED_TTS_VOICES,
  DEFAULT_TTS_MAX_CHARS,
  DEFAULT_UPSTREAM_TIMEOUT_MS,
  applyCorsAllowlist,
  isAllowedLanguageInput,
  mapGnaniLanguage,
  reconcileVoiceQuota,
  reserveVoiceQuota,
  resetAtomicFallbackQuotaForTest,
  verifySupabaseUserAndShop,
} from './_voiceShared.js';

const GNANI_TTS_INR_PER_CHAR = 0.0005;

export function resetGnaniTtsLimitsForTest(): void {
  resetAtomicFallbackQuotaForTest();
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    return await handleGnaniTts(req, res);
  } catch {
    if (!res.headersSent) {
      res.status(503).json({ success: false, error: 'Service temporarily unavailable' });
    }
  }
}

async function handleGnaniTts(req: VercelRequest, res: VercelResponse): Promise<void> {
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

  const chosenModel = (model || process.env.TIMBRE_TTS_MODEL || 'timbre-v2.5').trim();
  if (!ALLOWED_TTS_MODELS.has(chosenModel)) {
    res.status(400).json({ success: false, error: 'Unsupported model' });
    return;
  }

  const chosenVoice = (voice || process.env.TIMBRE_TTS_VOICE || 'Nalini').trim();
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

  const timbreUrl = process.env.TIMBRE_TTS_URL || process.env.GNANI_TTS_URL || '';
  const apiKey = process.env.GNANI_API_KEY || process.env.TIMBRE_API_KEY || '';

  if (!timbreUrl || !apiKey) {
    res.status(503).json({ success: false, error: 'Speech service unavailable' });
    return;
  }

  // Reserve estimated cost atomically before calling Timbre (fail closed if quota check errors)
  const quota = await reserveVoiceQuota(auth, estimatedInr, 'tts');
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
    const upstream = await fetch(timbreUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key-ID': apiKey,
      },
      body: JSON.stringify({
        text: cleanText,
        voice: chosenVoice,
        model: chosenModel,
        language: mappedLang,
        speed: 1.0,
        audio_config: {
          encoding: 'linear_pcm',
          container: 'wav',
          num_channels: 1,
          sample_rate: 16000,
          sample_width: 2,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const latency = Date.now() - t0;

    if (!upstream.ok) {
      await reconcileVoiceQuota(auth, quota.reservationId, 0);
      await upstream.json().catch(() => null);
      const statusMap: Record<number, { status: number; error: string }> = {
        401: { status: 502, error: 'Speech service authentication failed' },
        402: { status: 402, error: 'Voice quota exceeded' },
        422: { status: 400, error: 'Unsupported synthesis parameters' },
        429: { status: 429, error: 'Rate limit exceeded' },
        504: { status: 504, error: 'Speech synthesis timed out' },
      };
      const mapped = statusMap[upstream.status] || {
        status: 502,
        error: 'Speech synthesis unavailable',
      };
      res.status(mapped.status).json({ success: false, error: mapped.error });
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

    await reconcileVoiceQuota(auth, quota.reservationId, estimatedInr);
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
    await reconcileVoiceQuota(auth, quota.reservationId, 0);
    const isTimeout = err?.name === 'AbortError';
    res.status(isTimeout ? 504 : 502).json({
      success: false,
      error: isTimeout ? 'Speech synthesis timed out' : 'Speech synthesis failed',
    });
  }
}
