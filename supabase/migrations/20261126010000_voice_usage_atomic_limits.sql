-- Distributed atomic rate-limiting and daily/monthly rupee budget tracking for Gnani STT & Timbre TTS.
-- Never edit an already-applied migration; this is a new additive migration.

CREATE TABLE IF NOT EXISTS public.voice_usage (
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  usage_month text NOT NULL DEFAULT to_char(timezone('utc', now()), 'YYYY-MM'),
  spend_inr numeric(12, 6) NOT NULL DEFAULT 0 CHECK (spend_inr >= 0),
  req_count integer NOT NULL DEFAULT 0 CHECK (req_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_voice_usage_shop_month
  ON public.voice_usage (shop_id, usage_month);

CREATE TABLE IF NOT EXISTS public.voice_usage_global (
  usage_month text PRIMARY KEY,
  spend_inr numeric(12, 6) NOT NULL DEFAULT 0 CHECK (spend_inr >= 0),
  minute_window timestamptz NOT NULL DEFAULT date_trunc('minute', timezone('utc', now())),
  minute_req_count integer NOT NULL DEFAULT 0 CHECK (minute_req_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS with NO client write policies
ALTER TABLE public.voice_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_usage_global ENABLE ROW LEVEL SECURITY;

-- Atomic reservation RPC: derives shop_id from auth.uid(), checks per-shop daily cap,
-- per-shop monthly cap, global monthly cap, and global per-minute request counter,
-- and increments in one atomic statement/transaction.
CREATE OR REPLACE FUNCTION public.reserve_voice_quota(
  p_estimated_inr numeric,
  p_shop_daily_cap numeric DEFAULT 100,
  p_shop_monthly_cap numeric DEFAULT 1500,
  p_global_monthly_cap numeric DEFAULT 25000,
  p_global_rpm integer DEFAULT 120
)
RETURNS TABLE (
  allowed boolean,
  reason text,
  shop_id uuid,
  shop_daily_remaining numeric,
  shop_monthly_remaining numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shop_id uuid;
  v_today date := (timezone('utc', now()))::date;
  v_month text := to_char(timezone('utc', now()), 'YYYY-MM');
  v_minute timestamptz := date_trunc('minute', timezone('utc', now()));
  v_est numeric := GREATEST(0, COALESCE(p_estimated_inr, 0));
  v_global_spend numeric := 0;
  v_global_min timestamptz;
  v_global_rpm_count integer := 0;
  v_shop_daily numeric := 0;
  v_shop_monthly numeric := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'unauthorized'::text, NULL::uuid, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  SELECT u.shop_id INTO v_shop_id
  FROM public.users u
  WHERE u.id = v_uid
  LIMIT 1;

  IF v_shop_id IS NULL THEN
    RETURN QUERY SELECT false, 'shop_not_found'::text, NULL::uuid, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- Ensure global row exists and lock it for atomic RPM + global monthly check
  INSERT INTO public.voice_usage_global (usage_month, spend_inr, minute_window, minute_req_count)
  VALUES (v_month, 0, v_minute, 0)
  ON CONFLICT (usage_month) DO NOTHING;

  SELECT g.spend_inr, g.minute_window, g.minute_req_count
    INTO v_global_spend, v_global_min, v_global_rpm_count
  FROM public.voice_usage_global g
  WHERE g.usage_month = v_month
  FOR UPDATE;

  IF v_global_min <> v_minute THEN
    v_global_rpm_count := 0;
  END IF;

  IF v_global_rpm_count + 1 > GREATEST(1, p_global_rpm) THEN
    RETURN QUERY SELECT false, 'global_rate_limit'::text, v_shop_id, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  IF v_global_spend + v_est > GREATEST(0, p_global_monthly_cap) THEN
    RETURN QUERY SELECT false, 'global_monthly_budget'::text, v_shop_id, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- Ensure today's shop row exists and lock shop rows for this month
  INSERT INTO public.voice_usage (shop_id, usage_date, usage_month, spend_inr, req_count)
  VALUES (v_shop_id, v_today, v_month, 0, 0)
  ON CONFLICT (shop_id, usage_date) DO NOTHING;

  PERFORM 1
  FROM public.voice_usage vu
  WHERE vu.shop_id = v_shop_id AND vu.usage_month = v_month
  FOR UPDATE;

  SELECT COALESCE(vu.spend_inr, 0)
    INTO v_shop_daily
  FROM public.voice_usage vu
  WHERE vu.shop_id = v_shop_id AND vu.usage_date = v_today;

  SELECT COALESCE(SUM(vu.spend_inr), 0)
    INTO v_shop_monthly
  FROM public.voice_usage vu
  WHERE vu.shop_id = v_shop_id AND vu.usage_month = v_month;

  IF v_shop_daily + v_est > GREATEST(0, p_shop_daily_cap) THEN
    RETURN QUERY SELECT false, 'shop_daily_budget'::text, v_shop_id,
      GREATEST(0, p_shop_daily_cap - v_shop_daily),
      GREATEST(0, p_shop_monthly_cap - v_shop_monthly);
    RETURN;
  END IF;

  IF v_shop_monthly + v_est > GREATEST(0, p_shop_monthly_cap) THEN
    RETURN QUERY SELECT false, 'shop_monthly_budget'::text, v_shop_id,
      GREATEST(0, p_shop_daily_cap - v_shop_daily),
      GREATEST(0, p_shop_monthly_cap - v_shop_monthly);
    RETURN;
  END IF;

  -- All checks passed: increment global and shop counters atomically
  UPDATE public.voice_usage_global
  SET spend_inr = spend_inr + v_est,
      minute_window = v_minute,
      minute_req_count = v_global_rpm_count + 1,
      updated_at = now()
  WHERE usage_month = v_month;

  UPDATE public.voice_usage
  SET spend_inr = spend_inr + v_est,
      req_count = req_count + 1,
      updated_at = now()
  WHERE shop_id = v_shop_id AND usage_date = v_today;

  RETURN QUERY SELECT
    true,
    'ok'::text,
    v_shop_id,
    GREATEST(0, p_shop_daily_cap - (v_shop_daily + v_est)),
    GREATEST(0, p_shop_monthly_cap - (v_shop_monthly + v_est));
END;
$$;

-- Reconcile reserved amount after Gnani call completes (or refund fully on failure)
CREATE OR REPLACE FUNCTION public.reconcile_voice_quota(
  p_reserved_inr numeric,
  p_actual_inr numeric,
  p_succeeded boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shop_id uuid;
  v_today date := (timezone('utc', now()))::date;
  v_month text := to_char(timezone('utc', now()), 'YYYY-MM');
  v_delta numeric;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT u.shop_id INTO v_shop_id
  FROM public.users u
  WHERE u.id = v_uid
  LIMIT 1;

  IF v_shop_id IS NULL THEN
    RETURN;
  END IF;

  IF p_succeeded THEN
    v_delta := COALESCE(p_actual_inr, 0) - GREATEST(0, COALESCE(p_reserved_inr, 0));
  ELSE
    -- Never charge failed Gnani calls: refund the full reservation
    v_delta := -GREATEST(0, COALESCE(p_reserved_inr, 0));
  END IF;

  UPDATE public.voice_usage
  SET spend_inr = GREATEST(0, spend_inr + v_delta),
      updated_at = now()
  WHERE shop_id = v_shop_id AND usage_date = v_today;

  UPDATE public.voice_usage_global
  SET spend_inr = GREATEST(0, spend_inr + v_delta),
      updated_at = now()
  WHERE usage_month = v_month;
END;
$$;

-- Revoke execute from public roles
REVOKE ALL ON FUNCTION public.reserve_voice_quota(numeric, numeric, numeric, numeric, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reconcile_voice_quota(numeric, numeric, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_voice_quota(numeric, numeric, numeric, numeric, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_voice_quota(numeric, numeric, boolean) TO authenticated, service_role;
