import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await handleRegister(req, res);
  } catch {
    if (!res.headersSent) {
      res.status(503).json({ success: false, error: 'Service temporarily unavailable' });
    }
  }
}

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  // 1. CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ status: 'ok' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
    return;
  }

  // 2. Parse request body
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

  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const shopName = String(payload.shopName || '').trim();
  const ownerName = String(payload.ownerName || '').trim();
  const phone = String(payload.phone || '+919999999999').trim();

  if (!email || !password || !shopName) {
    res.status(400).json({
      success: false,
      error: 'Please enter shop name, email, and password.',
    });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters.',
    });
    return;
  }

  // 3. Supabase Credentials
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || 'https://eaordgyzpvbzshjqcxbv.supabase.co').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!serviceRoleKey) {
    res.status(500).json({
      success: false,
      error: 'Supabase admin service key is not configured on the server.',
    });
    return;
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 4. Create user with email_confirm: true (bypasses email delivery rate limits)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        shop_name: shopName,
        owner_name: ownerName || 'Shopkeeper',
      },
    });

    if (createError) {
      const msg = createError.message || '';
      if (msg.includes('already been registered') || msg.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'An account with this email is already registered. Please sign in.',
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: msg || 'Failed to create user account.',
      });
      return;
    }

    if (!userData?.user) {
      res.status(500).json({ success: false, error: 'User could not be created.' });
      return;
    }

    const newShopId = crypto.randomUUID();

    // 5. Insert shop record
    const { error: shopError } = await supabaseAdmin.from('shops').insert({
      id: newShopId,
      name: shopName || 'Kirana Store',
      owner_phone: phone,
    });

    if (shopError) {
      console.warn('[Register API] Error inserting shop:', shopError);
    }

    // 6. Insert user record
    const { error: userTableError } = await supabaseAdmin.from('users').insert({
      id: userData.user.id,
      shop_id: newShopId,
      name: ownerName || 'Shopkeeper',
      phone,
      role: 'owner',
    });

    if (userTableError) {
      console.warn('[Register API] Error inserting user record:', userTableError);
    }

    res.status(200).json({
      success: true,
      shopId: newShopId,
      userId: userData.user.id,
    });
  } catch {
    res.status(503).json({
      success: false,
      error: 'Registration service temporarily unavailable.',
    });
  }
}
