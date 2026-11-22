import { ItemUnit } from '../types/schema';

export interface ExtractedBillItem {
  id: string;
  name: string;
  quantity: number;
  unit: ItemUnit;
  price: number;
  mrp?: number;
  selected: boolean;
  priceType: 'selling' | 'cost';
}

export interface BillOcrResult {
  success: boolean;
  storeName?: string;
  totalAmount?: number;
  items: ExtractedBillItem[];
  error?: string;
}

function normalizeUnit(unitStr?: string): ItemUnit {
  if (!unitStr) return 'piece';
  const u = unitStr.toLowerCase().trim();
  if (u.includes('kilo') || u === 'kg' || u === 'kgs') return 'kilo';
  if (u.includes('litre') || u.includes('liter') || u === 'l' || u === 'ltr') return 'litre';
  if (u.includes('gram') || u === 'g' || u === 'gm' || u === 'gms') return 'gram';
  if (u.includes('pack') || u === 'pkt') return 'packet';
  if (u.includes('dabba') || u.includes('box') || u === 'bx') return 'dabba';
  if (u.includes('bori') || u.includes('bag') || u.includes('sack') || u.includes('quintal')) return 'bori';
  return 'piece';
}

export async function parseBillPhotoWithGemini(
  imageDataUrl: string,
  shopId?: string
): Promise<BillOcrResult> {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  // Strip prefix data:image/...;base64,
  let mimeType = 'image/jpeg';
  let base64Data = imageDataUrl;
  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    base64Data = match[2];
  }

  // 1. Try server-side Vercel serverless function (/api/bill-scan) first
  // Protects the GEMINI_API_KEY secret and enforces per-shop daily quota
  if (typeof window !== 'undefined') {
    try {
      const apiRes = await fetch('/api/bill-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': shopId || 'shop-1',
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
          shopId: shopId || 'shop-1',
        }),
      });

      if (apiRes.status === 429) {
        const errData = await apiRes.json().catch(() => ({}));
        return {
          success: false,
          error:
            errData.error ||
            'Daily bill scan quota exceeded for your store (max 20 scans per day). Quota resets at midnight.',
          items: [],
        };
      }

      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData.items && Array.isArray(apiData.items)) {
          const items: ExtractedBillItem[] = apiData.items.map((it: any, idx: number) => ({
            id: `bill-item-${Date.now()}-${idx}`,
            name: String(it.name || `Item ${idx + 1}`).trim(),
            quantity: Number(it.quantity) || 1,
            unit: normalizeUnit(it.unit),
            price: Number(it.price) || 0,
            mrp: it.mrp ? Number(it.mrp) : undefined,
            selected: true,
            priceType: 'cost', // Bills from distributors / suppliers are cost prices by default
          }));

          if (items.length > 0) {
            return {
              success: true,
              storeName: apiData.storeName || 'Supermarket / Store',
              totalAmount: Number(apiData.totalAmount) || items.reduce((sum, i) => sum + i.price * i.quantity, 0),
              items,
            };
          }
        }
      } else {
        const errData = await apiRes.json().catch(() => ({}));
        const message = errData.error || `Bill scan failed with status ${apiRes.status}`;
        console.warn('[BillScan] /api/bill-scan error:', apiRes.status, message);
        return {
          success: false,
          error: message,
          items: [],
        };
      }
    } catch (apiErr) {
      console.warn('[BillScan] /api/bill-scan not reachable or failed:', apiErr);
    }
  }

  // 2. Try server-side Supabase Edge Function only if explicitly enabled
  const useSupabaseOcr = import.meta.env.VITE_USE_SUPABASE_OCR === 'true';
  if (useSupabaseOcr && supabaseUrl && !supabaseUrl.includes('your-project') && !supabaseUrl.includes('placeholder')) {
    try {
      const edgeRes = await fetch(`${supabaseUrl}/functions/v1/bill-ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ imageBase64: base64Data, mimeType }),
      });
      if (edgeRes.ok) {
        const edgeData = await edgeRes.json();
        if (edgeData.items && Array.isArray(edgeData.items)) {
          const items: ExtractedBillItem[] = edgeData.items.map((it: any, idx: number) => ({
            id: `bill-item-${idx + 1}-${Date.now()}`,
            name: it.name || `Item ${idx + 1}`,
            quantity: Number(it.quantity) || 1,
            unit: normalizeUnit(it.unit),
            price: Number(it.price) || 0,
            mrp: it.mrp ? Number(it.mrp) : Number(it.price) || 0,
            selected: true,
            priceType: 'cost',
          }));
          return {
            success: true,
            storeName: edgeData.storeName || 'Local Store Receipt',
            totalAmount: Number(edgeData.totalAmount) || items.reduce((acc, i) => acc + i.price * i.quantity, 0),
            items,
          };
        }
      }
    } catch {
      // Fall through to offline mock or error
    }
  }

  // 3. Graceful Local / Demo Fallback (controlled by flag or demo mode)
  const isDemoOrMockAllowed =
    import.meta.env.VITE_DEMO_MODE === 'true' ||
    import.meta.env.VITE_ENABLE_MOCK_BILL_SCAN === 'true' ||
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');

  if (isDemoOrMockAllowed) {
    return {
      success: true,
      storeName: 'Local Store Receipt',
      totalAmount: 559,
      items: [
        {
          id: `bill-item-${Date.now()}-1`,
          name: 'Hatsun Curd 500g',
          quantity: 1,
          unit: 'packet',
          price: 40,
          mrp: 40,
          selected: true,
          priceType: 'cost',
        },
        {
          id: `bill-item-${Date.now()}-2`,
          name: 'Idhayam Oil 500ml',
          quantity: 1,
          unit: 'litre',
          price: 23,
          mrp: 23,
          selected: true,
          priceType: 'cost',
        },
        {
          id: `bill-item-${Date.now()}-3`,
          name: 'Butter Biscuit',
          quantity: 1,
          unit: 'packet',
          price: 46,
          mrp: 50,
          selected: true,
          priceType: 'cost',
        },
        {
          id: `bill-item-${Date.now()}-4`,
          name: 'Toastea Rusk',
          quantity: 2,
          unit: 'packet',
          price: 20,
          mrp: 20,
          selected: true,
          priceType: 'cost',
        },
        {
          id: `bill-item-${Date.now()}-5`,
          name: 'Udhayakrishna Ghee 500ml',
          quantity: 1,
          unit: 'packet',
          price: 430,
          mrp: 445,
          selected: true,
          priceType: 'cost',
        },
      ],
    };
  }

  return {
    success: false,
    items: [],
    error: 'Bill scan server function is unavailable. Please check your internet connection or server configuration.',
  };
}
