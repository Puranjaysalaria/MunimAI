-- Distributed atomic rate-limiting, daily/monthly rupee budget tracking, and
-- idempotent voice_reservations for Gnani STT & Timbre TTS.
-- All dates/months are computed in Asia/Kolkata; money is stored as integer paise.

CREATE TABLE IF NOT EXISTS public.voice_usage (
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT ((timezone('Asia/Kolkata', now()))::date),
  usage_month text NOT NULL DEFAULT to_char(timezone('Asia/Kolkata', now()), 'YYYY-MM'),
  spend_paise bigint NOT NULL DEFAULT 0 CHECK (spend_paise >= 0),
  req_count integer NOT NULL DEFAULT 0 CHECK (req_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_voice_usage_shop_month
  ON public.voice_usage (shop_id, usage_month);

CREATE TABLE IF NOT EXISTS public.voice_usage_global (
  usage_month text PRIMARY KEY,
  spend_paise bigint NOT NULL DEFAULT 0 CHECK (spend_paise >= 0),
  minute_window timestamptz NOT NULL DEFAULT date_trunc('minute', timezone('Asia/Kolkata', now())),
  minute_req_count integer NOT NULL DEFAULT 0 CHECK (minute_req_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_reservations (
  reservation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('gnani')),
  kind text NOT NULL CHECK (kind IN ('stt', 'tts')),
  reserved_paise integer NOT NULL CHECK (reserved_paise > 0),
  actual_paise integer CHECK (actual_paise IS NULL OR actual_paise >= 0),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'settled', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_voice_reservations_shop_status
  ON public.voice_reservations (shop_id, status, created_at);

-- Enable RLS on all tables with ZERO client write policies
ALTER TABLE public.voice_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_usage_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_reservations ENABLE ROW LEVEL SECURITY;

-- Drop legacy signatures if present
DROP FUNCTION IF EXISTS public.reserve_voice_quota(numeric, numeric, numeric, numeric, integer);
DROP FUNCTION IF EXISTS public.reconcile_voice_quota(numeric, numeric, boolean);

CREATE OR REPLACE FUNCTION public.reserve_voice_quota(
  p_shop_id uuid,
  p_provider text,
  p_kind text,
  p_estimated_inr numeric,
  p_shop_daily_cap numeric DEFAULT 100,
  p_shop_monthly_cap numeric DEFAULT 1500,
  p_global_monthly_cap numeric DEFAULT 25000,
  p_global_rpm integer DEFAULT 120
)
RETURNS TABLE (
  allowed boolean,
  reason text,
  reservation_id uuid,
  shop_daily_remaining_paise bigint,
  shop_monthly_remaining_paise bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today date := (timezone('Asia/Kolkata', now()))::date;
  v_month text := to_char(timezone('Asia/Kolkata', now()), 'YYYY-MM');
  v_minute timestamptz := date_trunc('minute', timezone('Asia/Kolkata', now()));
  v_est_paise integer;
  v_shop_daily_cap_paise bigint;
  v_shop_monthly_cap_paise bigint;
  v_global_monthly_cap_paise bigint;
  v_global_spend bigint := 0;
  v_global_min timestamptz;
  v_global_rpm_count integer := 0;
  v_shop_daily bigint := 0;
  v_shop_monthly bigint := 0;
  v_res_id uuid;
BEGIN
  -- Input validation: reject NULL, non-positive, NaN/Infinity, oversized (> Rs 1000), unknown provider/kind
  IF p_shop_id IS NULL THEN
    RAISE EXCEPTION 'Invalid shop_id';
  END IF;
  IF p_provider IS NULL OR p_provider NOT IN ('gnani') THEN
    RAISE EXCEPTION 'Invalid provider: %', p_provider;
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('stt', 'tts') THEN
    RAISE EXCEPTION 'Invalid kind: %', p_kind;
  END IF;
  IF p_estimated_inr IS NULL
     OR p_estimated_inr = 'NaN'::numeric
     OR p_estimated_inr = 'Infinity'::numeric
     OR p_estimated_inr = '-Infinity'::numeric
     OR p_estimated_inr <= 0
     OR p_estimated_inr > 1000 THEN
    RAISE EXCEPTION 'Invalid estimated amount: %', p_estimated_inr;
  END IF;

  v_est_paise := GREATEST(1, round(p_estimated_inr * 100)::integer);
  v_shop_daily_cap_paise := GREATEST(0, round(COALESCE(p_shop_daily_cap, 100) * 100)::bigint);
  v_shop_monthly_cap_paise := GREATEST(0, round(COALESCE(p_shop_monthly_cap, 1500) * 100)::bigint);
  v_global_monthly_cap_paise := GREATEST(0, round(COALESCE(p_global_monthly_cap, 25000) * 100)::bigint);

  -- Ensure counter rows exist, then lock in fixed order: 1) voice_usage_global, 2) voice_usage
  INSERT INTO public.voice_usage_global (usage_month, spend_paise, minute_window, minute_req_count)
  VALUES (v_month, 0, v_minute, 0)
  ON CONFLICT (usage_month) DO NOTHING;

  INSERT INTO public.voice_usage (shop_id, usage_date, usage_month, spend_paise, req_count)
  VALUES (p_shop_id, v_today, v_month, 0, 0)
  ON CONFLICT (shop_id, usage_date) DO NOTHING;

  SELECT g.spend_paise, g.minute_window, g.minute_req_count
    INTO v_global_spend, v_global_min, v_global_rpm_count
  FROM public.voice_usage_global g
  WHERE g.usage_month = v_month
  FOR UPDATE;

  PERFORM 1
  FROM public.voice_usage vu
  WHERE vu.shop_id = p_shop_id AND vu.usage_month = v_month
  FOR UPDATE;

  IF v_global_min <> v_minute THEN
    v_global_rpm_count := 0;
  END IF;

  -- Check all four limits BEFORE any mutation
  IF v_global_rpm_count + 1 > GREATEST(1, COALESCE(p_global_rpm, 120)) THEN
    RETURN QUERY SELECT false, 'global_rate_limit'::text, NULL::uuid, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  IF v_global_spend + v_est_paise > v_global_monthly_cap_paise THEN
    RETURN QUERY SELECT false, 'global_monthly_budget'::text, NULL::uuid, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  SELECT COALESCE(vu.spend_paise, 0)
    INTO v_shop_daily
  FROM public.voice_usage vu
  WHERE vu.shop_id = p_shop_id AND vu.usage_date = v_today;

  SELECT COALESCE(SUM(vu.spend_paise), 0)
    INTO v_shop_monthly
  FROM public.voice_usage vu
  WHERE vu.shop_id = p_shop_id AND vu.usage_month = v_month;

  IF v_shop_daily + v_est_paise > v_shop_daily_cap_paise THEN
    RETURN QUERY SELECT false, 'shop_daily_budget'::text, NULL::uuid,
      GREATEST(0, v_shop_daily_cap_paise - v_shop_daily),
      GREATEST(0, v_shop_monthly_cap_paise - v_shop_monthly);
    RETURN;
  END IF;

  IF v_shop_monthly + v_est_paise > v_shop_monthly_cap_paise THEN
    RETURN QUERY SELECT false, 'shop_monthly_budget'::text, NULL::uuid,
      GREATEST(0, v_shop_daily_cap_paise - v_shop_daily),
      GREATEST(0, v_shop_monthly_cap_paise - v_shop_monthly);
    RETURN;
  END IF;

  -- All checks passed: update counters and create reservation
  UPDATE public.voice_usage_global
  SET spend_paise = spend_paise + v_est_paise,
      minute_window = v_minute,
      minute_req_count = v_global_rpm_count + 1,
      updated_at = now()
  WHERE usage_month = v_month;

  UPDATE public.voice_usage
  SET spend_paise = spend_paise + v_est_paise,
      req_count = req_count + 1,
      updated_at = now()
  WHERE shop_id = p_shop_id AND usage_date = v_today;

  INSERT INTO public.voice_reservations (shop_id, provider, kind, reserved_paise, status)
  VALUES (p_shop_id, p_provider, p_kind, v_est_paise, 'reserved')
  RETURNING voice_reservations.reservation_id INTO v_res_id;

  RETURN QUERY SELECT
    true,
    'ok'::text,
    v_res_id,
    GREATEST(0, v_shop_daily_cap_paise - (v_shop_daily + v_est_paise)),
    GREATEST(0, v_shop_monthly_cap_paise - (v_shop_monthly + v_est_paise));
END;
$$;

-- Idempotent reconcile: locks reservation row, applies only if status = 'reserved' and shop matches,
-- refunds between 0 and reserved_paise, and marks settled.
CREATE OR REPLACE FUNCTION public.reconcile_voice_quota(
  p_reservation_id uuid,
  p_shop_id uuid,
  p_actual_inr numeric
)
RETURNS TABLE (
  settled boolean,
  refunded_paise integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res public.voice_reservations%ROWTYPE;
  v_actual_paise integer;
  v_refund_paise integer;
  v_res_day date;
  v_res_month text;
BEGIN
  IF p_reservation_id IS NULL OR p_shop_id IS NULL THEN
    RAISE EXCEPTION 'Invalid reservation_id or shop_id';
  END IF;
  IF p_actual_inr IS NULL
     OR p_actual_inr = 'NaN'::numeric
     OR p_actual_inr = 'Infinity'::numeric
     OR p_actual_inr = '-Infinity'::numeric
     OR p_actual_inr < 0
     OR p_actual_inr > 1000 THEN
    RAISE EXCEPTION 'Invalid actual amount: %', p_actual_inr;
  END IF;

  -- Lock reservation row first; repeated or wrong-shop call changes nothing
  SELECT * INTO v_res
  FROM public.voice_reservations vr
  WHERE vr.reservation_id = p_reservation_id
    AND vr.shop_id = p_shop_id
  FOR UPDATE;

  IF NOT FOUND OR v_res.status <> 'reserved' THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  -- Clamp actual charge to [0, reserved_paise] so refund is always in [0, reserved_paise]
  v_actual_paise := LEAST(v_res.reserved_paise, GREATEST(0, round(p_actual_inr * 100)::integer));
  v_refund_paise := v_res.reserved_paise - v_actual_paise;
  v_res_day := (timezone('Asia/Kolkata', v_res.created_at))::date;
  v_res_month := to_char(timezone('Asia/Kolkata', v_res.created_at), 'YYYY-MM');

  IF v_refund_paise > 0 THEN
    -- Lock counter rows in the same fixed order: global -> shop
    UPDATE public.voice_usage_global
    SET spend_paise = GREATEST(0, spend_paise - v_refund_paise),
        updated_at = now()
    WHERE usage_month = v_res_month;

    UPDATE public.voice_usage
    SET spend_paise = GREATEST(0, spend_paise - v_refund_paise),
        updated_at = now()
    WHERE shop_id = p_shop_id AND usage_date = v_res_day;
  END IF;

  UPDATE public.voice_reservations
  SET actual_paise = v_actual_paise,
      status = 'settled',
      settled_at = now()
  WHERE reservation_id = p_reservation_id;

  RETURN QUERY SELECT true, v_refund_paise;
END;
$$;

-- Expiry cleanup: marks stale 'reserved' rows as 'expired' WITHOUT refunding them
CREATE OR REPLACE FUNCTION public.expire_stale_voice_reservations(
  p_max_age_minutes integer DEFAULT 15
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.voice_reservations
  SET status = 'expired',
      settled_at = now()
  WHERE status = 'reserved'
    AND created_at < now() - make_interval(mins => GREATEST(1, COALESCE(p_max_age_minutes, 15)));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Strict permissions: revoke from PUBLIC, anon, authenticated; grant ONLY to service_role
REVOKE ALL ON FUNCTION public.reserve_voice_quota(uuid, text, text, numeric, numeric, numeric, numeric, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_voice_quota(uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_stale_voice_reservations(integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_voice_quota(uuid, text, text, numeric, numeric, numeric, numeric, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_voice_quota(uuid, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_voice_reservations(integer) TO service_role;
