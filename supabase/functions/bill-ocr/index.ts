import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Server GEMINI_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64 in request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are an expert OCR parser for Indian kirana store, retail, and supermarket printed or handwritten receipts, invoices, and bills.
Analyze this bill photo and extract:
1. storeName: The name of the store or supermarket printed at the top.
2. totalAmount: The final net payable or total amount printed on the bill as a number.
3. items: Array of all purchased or billed items. For each item extract:
   - name: readable standard product name (e.g. "Hatsun Curd 500g", "Refined Oil", "Butter Biscuit", "Toastea Rusk", "Pure Ghee 500ml")
   - quantity: numeric quantity (default 1)
   - unit: one of "kilo", "litre", "gram", "packet", "piece", "bottle", "dozen", "box", "bag"
   - price: unit rate or item price (Rate or Amount) as a number
   - mrp: original MRP if printed, else same as price

Return STRICT valid JSON without markdown fences matching:
{
  "storeName": "Store Name",
  "totalAmount": 559,
  "items": [
    { "name": "Butter Biscuit", "quantity": 1, "unit": "packet", "price": 46, "mrp": 50 }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return new Response(JSON.stringify({ success: true, ...parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Error processing OCR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
