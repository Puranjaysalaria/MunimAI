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

  const action = String(payload.action || 'register').trim();

  // Supabase Credentials
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://eaordgyzpvbzshjqcxbv.supabase.co'
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!serviceRoleKey) {
    res.status(500).json({
      success: false,
      error: 'Supabase admin service key is not configured on the server.',
    });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Provision shop & user profile for an existing authenticated user whose profile row is missing
  if (action === 'provision') {
    const authHeader = String(req.headers?.authorization || '').trim();
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    try {
      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (userErr || !userData?.user?.id) {
        res.status(401).json({ success: false, error: 'Invalid session' });
        return;
      }
      const authUser = userData.user;
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (existingUser?.shop_id) {
        const { data: existingShop } = await supabaseAdmin
          .from('shops')
          .select('*')
          .eq('id', existingUser.shop_id)
          .maybeSingle();
        res.status(200).json({ success: true, shop: existingShop, user: existingUser });
        return;
      }

      const newShopId = crypto.randomUUID();
      const meta = (authUser.user_metadata || {}) as Record<string, string>;
      const uniqueFallbackPhone = `+919${String(Math.floor(100000000 + Math.random() * 900000000))}`;
      const ownerPhone = authUser.phone || uniqueFallbackPhone;
      const shopPayload = {
        id: newShopId,
        name: meta.shop_name || 'My Shop',
        owner_phone: ownerPhone,
      };
      const { data: createdShop, error: shopErr } = await supabaseAdmin
        .from('shops')
        .insert(shopPayload)
        .select()
        .maybeSingle();
      if (shopErr) {
        res.status(500).json({ success: false, error: shopErr.message });
        return;
      }

      const userPayload = {
        id: authUser.id,
        shop_id: newShopId,
        name: meta.owner_name || authUser.email?.split('@')[0] || 'Shop Owner',
        phone: ownerPhone,
        role: 'owner',
      };
      const { data: createdUser, error: usrErr } = await supabaseAdmin
        .from('users')
        .insert(userPayload)
        .select()
        .maybeSingle();
      if (usrErr) {
        res.status(500).json({ success: false, error: usrErr.message });
        return;
      }

      res.status(200).json({
        success: true,
        shop: createdShop || shopPayload,
        user: createdUser || userPayload,
      });
      return;
    } catch {
      res.status(503).json({ success: false, error: 'Provisioning failed' });
      return;
    }
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const shopName = String(payload.shopName || '').trim();
  const ownerName = String(payload.ownerName || '').trim();
  const phone = String(
    payload.phone || `+919${String(Math.floor(100000000 + Math.random() * 900000000))}`
  ).trim();

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

  try {

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
