-- ====================================================================
-- pgTAP / Local Supabase RLS & Atomic Rollback Verification Test
-- Run with: npx supabase start && npx supabase db reset && npx supabase test db
-- ====================================================================
BEGIN;
SELECT plan(4);

-- Setup Shop A & Shop B
INSERT INTO public.shops (id, name, owner_phone) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Shop A', '+919000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Shop B', '+919000000002')
ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, shop_id, phone, name, role) VALUES
  ('aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', '+919000000001', 'Owner A', 'owner')
ON CONFLICT DO NOTHING;

INSERT INTO public.customers (id, shop_id, name, balance_owed) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ramesh', 500)
ON CONFLICT DO NOTHING;

INSERT INTO public.transactions (id, shop_id, type, amount, customer_id, confirmed_by_voice) VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'credit', 500, 'cccccccc-0000-0000-0000-000000000001', true)
ON CONFLICT DO NOTHING;

-- Impersonate Owner A via authenticated JWT claim
SET LOCAL role = authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-1111-1111-1111-111111111111', true);

-- 1. Cross-shop call must fail with Unauthorized shop_id
SELECT throws_ok(
  $$ SELECT public.apply_correction_atomic(
       'bbbbbbbb-0000-0000-0000-000000000002',
       'dddddddd-0000-0000-0000-000000000001',
       NULL,
       '{"id":"eeeeeeee-0000-0000-0000-000000000001","type":"credit","amount":500,"created_at":"2026-11-26T00:00:00Z"}'::jsonb,
       '{"id":"ffffffff-0000-0000-0000-000000000001","type":"credit","amount":600,"created_at":"2026-11-26T00:00:00Z"}'::jsonb,
       '[]'::jsonb, '[]'::jsonb, '{"entity_id":"dddddddd-0000-0000-0000-000000000001","actor_name":"Owner A"}'::jsonb
     ) $$,
  'Unauthorized shop_id',
  'Cross-shop RPC call is rejected'
);

-- 2. Mid-RPC constraint failure (invalid audit_log action) must roll back ALL prior inserts & updates
SELECT throws_ok(
  $$ SELECT public.apply_correction_atomic(
       'aaaaaaaa-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000001',
       NULL,
       '{"id":"eeeeeeee-0000-0000-0000-000000000002","type":"credit","amount":500,"created_at":"2026-11-26T00:00:00Z"}'::jsonb,
       '{"id":"ffffffff-0000-0000-0000-000000000002","type":"credit","amount":700,"created_at":"2026-11-26T00:00:00Z"}'::jsonb,
       '[{"customerId":"cccccccc-0000-0000-0000-000000000001","delta":200}]'::jsonb,
       '[]'::jsonb,
       '{"entity_id":"dddddddd-0000-0000-0000-000000000001","actor_name":"Owner A","action":"INVALID_ACTION"}'::jsonb
     ) $$,
  NULL,
  'Invalid audit_logs action aborts RPC'
);

-- 3. Verify customer balance was NOT mutated (rolled back to 500)
SELECT is(
  (SELECT balance_owed::NUMERIC FROM public.customers WHERE id = 'cccccccc-0000-0000-0000-000000000001'),
  500::NUMERIC,
  'Customer balance rolled back atomically after audit_logs failure'
);

-- 4. Verify original transaction superseded_by is still NULL
SELECT is(
  (SELECT superseded_by FROM public.transactions WHERE id = 'dddddddd-0000-0000-0000-000000000001'),
  NULL::UUID,
  'Original transaction superseded_by rolled back to NULL'
);

SELECT * FROM finish();
ROLLBACK;
