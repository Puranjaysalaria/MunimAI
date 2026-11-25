import type { VercelRequest, VercelResponse } from '@vercel/node';

const LANGUAGE_MAP: Record<string, string> = {
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

export function mapGnaniLanguage(lang?: string): string {
  return LANGUAGE_MAP[(lang || 'hi').trim()] || 'hi-IN';
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      res.status(400).json({ success: false, error: 'Invalid JSON body.' });
      return;
    }
  }
  payload = payload || {};

  const { audioBase64, language, speechStartedAtMs } = payload as {
    audioBase64?: string;
    language?: string;
    speechStartedAtMs?: number;
  };

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Missing audioBase64 in request body.',
      speechStartedAtMs,
    });
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

  // Reject oversized clips (> ~1 MB, well above 15s of 16kHz 16-bit mono WAV = 480 KB)
  if (audioBuffer.length > 1024 * 1024) {
    res.status(413).json({
      success: false,
      error: 'Command audio clip exceeds maximum allowed size.',
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
      error: 'Gnani STT credentials are not configured on the server.',
      speechStartedAtMs,
    });
    return;
  }

  const mappedLang = mapGnaniLanguage(language);

  try {
    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });
    formData.append('audio', audioBlob, 'command.wav');
    formData.append('lang', mappedLang);
    formData.append('encoding', 'pcm16');
    formData.append('sample_rate', '16000');

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

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      res.status(502).json({
        success: false,
        error: `Gnani upstream error HTTP ${upstream.status}`,
        detail: detail.slice(0, 300),
        speechStartedAtMs,
      });
      return;
    }

    const data = (await upstream.json()) as {
      transcript?: string;
      text?: string;
      confidence?: number;
    };

    res.status(200).json({
      success: true,
      provider: 'gnani',
      language: mappedLang,
      transcript: (data.transcript ?? data.text ?? '').trim(),
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.95,
      speechStartedAtMs,
    });
  } catch (err: any) {
    res.status(502).json({
      success: false,
      error: err?.message || 'Failed to reach Gnani STT service.',
      speechStartedAtMs,
    });
  }
}
