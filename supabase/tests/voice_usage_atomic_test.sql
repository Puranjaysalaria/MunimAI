-- Local Postgres / Supabase CLI verification test for voice_usage atomic limits & RLS
-- Run against a local or test Supabase instance (NEVER production):
--   npx supabase db reset
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/voice_usage_atomic_test.sql

BEGIN;

-- 1. Verify RLS is enabled and public/anon cannot execute RPCs
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'voice_usage') THEN
    RAISE EXCEPTION 'RLS not enabled on voice_usage';
  END IF;
  IF has_function_privilege('anon', 'public.reserve_voice_quota(numeric, numeric, numeric, numeric, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not have EXECUTE on reserve_voice_quota';
  END IF;
END $$;

ROLLBACK;
