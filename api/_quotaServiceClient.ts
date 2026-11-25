import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Isolated service-role Supabase client module used ONLY for voice quota RPC calls.
 * Never import this from client code or non-quota modules.
 * Fails closed when SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL is missing.
 */

export function getQuotaServiceRoleClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder')) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
