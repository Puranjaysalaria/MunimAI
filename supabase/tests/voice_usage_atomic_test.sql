-- Local Postgres / Supabase CLI verification test for voice_usage atomic limits, reservations & RLS
-- Run against a local or test Supabase instance (NEVER production):
--   npx supabase db reset
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/voice_usage_atomic_test.sql

BEGIN;

DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'voice_usage') THEN
    RAISE EXCEPTION 'RLS not enabled on voice_usage';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'voice_usage_global') THEN
    RAISE EXCEPTION 'RLS not enabled on voice_usage_global';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'voice_reservations') THEN
    RAISE EXCEPTION 'RLS not enabled on voice_reservations';
  END IF;

  IF has_function_privilege('anon', 'public.reserve_voice_quota(uuid, text, text, numeric, numeric, numeric, numeric, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not have EXECUTE on reserve_voice_quota';
  END IF;
  IF has_function_privilege('authenticated', 'public.reserve_voice_quota(uuid, text, text, numeric, numeric, numeric, numeric, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must not have EXECUTE on reserve_voice_quota';
  END IF;
  IF has_function_privilege('anon', 'public.reconcile_voice_quota(uuid, uuid, numeric)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not have EXECUTE on reconcile_voice_quota';
  END IF;
  IF has_function_privilege('authenticated', 'public.reconcile_voice_quota(uuid, uuid, numeric)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must not have EXECUTE on reconcile_voice_quota';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.reserve_voice_quota(uuid, text, text, numeric, numeric, numeric, numeric, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must have EXECUTE on reserve_voice_quota';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.reconcile_voice_quota(uuid, uuid, numeric)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must have EXECUTE on reconcile_voice_quota';
  END IF;
END $$;

ROLLBACK;
