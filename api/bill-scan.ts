import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory per-shop daily quota tracker
// Key format: `${shopId}:${YYYY-MM-DD}`
const dailyScanCounts = new Map<string, number>();

export function getDailyQuotaStatus(shopId: string, dailyCap: number = 20): {
  shopId: string;
  dailyCap: number;
  scansUsed: number;
  remainingToday: number;
  isExceeded: boolean;
} {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${shopId}:${today}`;
  const scansUsed = dailyScanCounts.get(key) || 0;
  return {
    shopId,
    dailyCap,
    scansUsed,
    remainingToday: Math.max(0, dailyCap - scansUsed),
    isExceeded: scansUsed >= dailyCap,
  };
}

export function incrementDailyScan(shopId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${shopId}:${today}`;

  // Purge expired days
  for (const k of dailyScanCounts.keys()) {
    if (!k.endsWith(today)) {
      dailyScanCounts.delete(k);
    }
  }

  const current = dailyScanCounts.get(key) || 0;
  const updated = current + 1;
  dailyScanCounts.set(key, updated);
  return updated;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-shop-id');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ status: 'ok' });
    return;
  }

  // 2. Method check
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
    return;
  }

  // 3. Verify Server-Side Secret
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    res.status(503).json({
      success: false,
      error: 'Gemini Bill OCR API key is not configured on the server. Please set GEMINI_API_KEY in Vercel environment variables.',
    });
    return;
  }

  // 4. Parse request body
  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      res.status(400).json({ success: false, error: 'Invalid JSON request body.' });
      return;
    }
  }
  payload = payload || {};

  const shopId = (
    payload.shopId ||
    (req.headers['x-shop-id'] as string) ||
    'default-shop'
  ).trim();

  const dailyCap = Math.max(1, Number(process.env.BILL_SCAN_DAILY_CAP) || 20);

  // 5. Per-Shop Daily Quota Check
  const quota = getDailyQuotaStatus(shopId, dailyCap);
  if (quota.isExceeded) {
    res.status(429).json({
      success: false,
      error: `Daily bill scan quota exceeded for store "${shopId}" (${dailyCap} scans per day). Quota resets at 00:00 UTC.`,
      dailyLimit: dailyCap,
      scansUsed: quota.scansUsed,
      remainingToday: 0,
    });
    return;
  }

  // 6. Validate Image Payload
  const imageBase64 = payload.imageBase64;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Missing imageBase64 in request body.',
    });
    return;
  }

  const mimeType = (payload.mimeType || 'image/jpeg').trim();

  // Strip prefix if client sent full data: URL
  const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

  try {
    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-1.5-flash',
    ].filter(Boolean) as string[];

    const promptText = `You are an expert OCR parser for Indian kirana store, retail, and supermarket receipts, invoices, and bills.
Analyze this bill photo and extract:
1. storeName: The name of the store or supermarket printed at the top (or "Retail Store" if unknown).
2. totalAmount: The grand total amount printed on the bill (numeric only).
3. items: Array of objects for each purchased item:
   - name: Product name in clear English (e.g. "Hatsun Curd 500g", "Aashirvaad Atta 5kg", "Toastea Rusk").
   - quantity: Numeric quantity (default 1 if not specified).
   - unit: Best matching unit from: "kilo", "litre", "packet", "piece", "gram", "dabba", "bori" (default "piece").
   - price: Price or rate for this item (numeric only).
   - mrp: Maximum retail price printed on receipt if available (or same as price).

Respond STRICTLY with valid JSON in this exact structure, with no markdown fences, no explanatory text:
{
  "storeName": "Store Name",
  "totalAmount": 120,
  "items": [
    { "name": "Item Name", "quantity": 1, "unit": "packet", "price": 40, "mrp": 40 }
  ]
}`;

    let lastError = '';
    let response: Response | null = null;

    for (const model of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        const resAttempt = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inlineData: {
                      mimeType,
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (resAttempt.ok) {
          response = resAttempt;
          break;
        }

        const errText = await resAttempt.text();
        lastError = `Model ${model} returned ${resAttempt.status}: ${errText.slice(0, 300)}`;

        // If model not found (404), temporarily overloaded (503), rate-limited (429), or server error (500+), try next candidate
        if (
          resAttempt.status === 404 ||
          resAttempt.status === 503 ||
          resAttempt.status === 429 ||
          resAttempt.status >= 500
        ) {
          continue;
        } else {
          // If client-side error (e.g. 400 bad payload), stop and report
          response = resAttempt;
          break;
        }
      } catch (fetchErr: any) {
        lastError = `Network error calling ${model}: ${fetchErr?.message || String(fetchErr)}`;
      }
    }

    if (!response || !response.ok) {
      if (lastError) {
        console.warn('[BillScan Server]', lastError);
      }

      const status = response?.status || 503;
      let friendlyError =
        'AI bill scanner is temporarily busy due to high demand. Please try again in a few moments.';
      if (status === 401 || status === 403) {
        friendlyError = 'Gemini API key is invalid or unauthorized. Please verify server environment variables.';
      } else if (status === 400) {
        friendlyError = 'Receipt photo could not be read. Please upload a clear photo of the bill.';
      }

      res.status(status).json({
        success: false,
        error: friendlyError,
      });
      return;
    }

    const data = await response.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Sanitize any accidental markdown formatting
    const cleanedJson = candidateText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedJson);

    // Increment daily usage on success
    const updatedScans = incrementDailyScan(shopId);

    res.status(200).json({
      success: true,
      storeName: parsed.storeName || 'Local Store Receipt',
      totalAmount: Number(parsed.totalAmount) || 0,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      dailyLimit: dailyCap,
      scansUsed: updatedScans,
      remainingToday: Math.max(0, dailyCap - updatedScans),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while processing bill image.',
    });
  }
}
