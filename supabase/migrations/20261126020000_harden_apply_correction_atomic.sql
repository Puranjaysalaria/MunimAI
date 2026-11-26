-- ====================================================================
-- Munim AI - Hardening Migration for apply_correction_atomic RPC
-- Migration: 20261126020000_harden_apply_correction_atomic.sql
-- Fixes NULL auth_shop_id() bypass, sets search_path = public,
-- and revokes EXECUTE from PUBLIC and anon.
-- ====================================================================

REVOKE ALL ON FUNCTION public.apply_correction_atomic(
  UUID, UUID, UUID, JSONB, JSONB, JSONB, JSONB, JSONB
) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.apply_correction_atomic(
    p_shop_id UUID,
    p_target_tx_id UUID,
    p_expected_superseded_by UUID,
    p_reversal_tx JSONB,
    p_correction_tx JSONB,
    p_customer_deltas JSONB,
    p_stock_deltas JSONB,
    p_audit_log JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_target RECORD;
    v_corr_id UUID := (p_correction_tx->>'id')::UUID;
    v_rev_id UUID := (p_reversal_tx->>'id')::UUID;
    v_cust JSONB;
    v_stk JSONB;
BEGIN
    -- Explicit NULL-safe check (p_shop_id <> NULL evaluates to UNKNOWN, not TRUE)
    IF public.auth_shop_id() IS NULL OR p_shop_id IS DISTINCT FROM public.auth_shop_id() THEN
        RAISE EXCEPTION 'Unauthorized shop_id';
    END IF;

    -- Idempotent replay check
    IF EXISTS (SELECT 1 FROM public.transactions WHERE id = v_corr_id AND shop_id = p_shop_id) THEN
        RETURN jsonb_build_object('status', 'already_applied', 'correction_id', v_corr_id);
    END IF;

    -- Lock original/target row and verify optimistic concurrency on superseded_by
    SELECT id, superseded_by INTO v_target
    FROM public.transactions
    WHERE id = p_target_tx_id AND shop_id = p_shop_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'not_found');
    END IF;

    IF v_target.superseded_by IS DISTINCT FROM p_expected_superseded_by THEN
        RETURN jsonb_build_object(
            'status', 'conflict',
            'current_superseded_by', v_target.superseded_by
        );
    END IF;

    INSERT INTO public.transactions (
        id, shop_id, type, amount, items, customer_id, created_at,
        confirmed_by_voice, parent_transaction_id, previous_correction_id,
        is_correction, is_reversal, note, source
    ) VALUES (
        v_rev_id, p_shop_id, p_reversal_tx->>'type', (p_reversal_tx->>'amount')::NUMERIC,
        COALESCE(p_reversal_tx->'items', '[]'::jsonb), NULLIF(p_reversal_tx->>'customer_id', '')::UUID,
        (p_reversal_tx->>'created_at')::TIMESTAMPTZ, COALESCE((p_reversal_tx->>'confirmed_by_voice')::BOOLEAN, false),
        NULLIF(p_reversal_tx->>'parent_transaction_id', '')::UUID, NULLIF(p_reversal_tx->>'previous_correction_id', '')::UUID,
        false, true, p_reversal_tx->>'note', COALESCE(p_reversal_tx->>'source', 'voice')
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.transactions (
        id, shop_id, type, amount, items, customer_id, created_at,
        confirmed_by_voice, parent_transaction_id, previous_correction_id,
        is_correction, is_reversal, note, source
    ) VALUES (
        v_corr_id, p_shop_id, p_correction_tx->>'type', (p_correction_tx->>'amount')::NUMERIC,
        COALESCE(p_correction_tx->'items', '[]'::jsonb), NULLIF(p_correction_tx->>'customer_id', '')::UUID,
        (p_correction_tx->>'created_at')::TIMESTAMPTZ, COALESCE((p_correction_tx->>'confirmed_by_voice')::BOOLEAN, false),
        NULLIF(p_correction_tx->>'parent_transaction_id', '')::UUID, NULLIF(p_correction_tx->>'previous_correction_id', '')::UUID,
        true, false, p_correction_tx->>'note', COALESCE(p_correction_tx->>'source', 'voice')
    ) ON CONFLICT (id) DO NOTHING;

    UPDATE public.transactions
    SET superseded_by = v_corr_id
    WHERE id = p_target_tx_id AND shop_id = p_shop_id;

    FOR v_cust IN SELECT * FROM jsonb_array_elements(COALESCE(p_customer_deltas, '[]'::jsonb)) LOOP
        UPDATE public.customers
        SET balance_owed = GREATEST(0, balance_owed + (v_cust->>'delta')::NUMERIC),
            updated_at = now()
        WHERE id = (v_cust->>'customerId')::UUID AND shop_id = p_shop_id;
    END LOOP;

    FOR v_stk IN SELECT * FROM jsonb_array_elements(COALESCE(p_stock_deltas, '[]'::jsonb)) LOOP
        UPDATE public.items
        SET current_stock = GREATEST(0, current_stock - (v_stk->>'quantityDelta')::NUMERIC),
            updated_at = now()
        WHERE LOWER(name) = LOWER(v_stk->>'itemName') AND shop_id = p_shop_id;
    END LOOP;

    INSERT INTO public.audit_logs (
        shop_id, entity_type, entity_id, previous_correction_id, action,
        actor_id, actor_name, actor_role, before_value, after_value, reason, source, created_at
    ) VALUES (
        p_shop_id, COALESCE(p_audit_log->>'entity_type', 'transaction'), p_audit_log->>'entity_id',
        p_audit_log->>'previous_correction_id', COALESCE(p_audit_log->>'action', 'edit'),
        NULLIF(p_audit_log->>'actor_id', '')::UUID, p_audit_log->>'actor_name',
        COALESCE(p_audit_log->>'actor_role', 'owner'), COALESCE(p_audit_log->'before_value', '{}'::jsonb),
        COALESCE(p_audit_log->'after_value', '{}'::jsonb), p_audit_log->>'reason',
        COALESCE(p_audit_log->>'source', 'voice'), COALESCE((p_audit_log->>'created_at')::TIMESTAMPTZ, now())
    );

    RETURN jsonb_build_object('status', 'applied', 'correction_id', v_corr_id);
END;
$$;

-- Re-issue REVOKE after CREATE OR REPLACE and grant only to authenticated + service_role
REVOKE ALL ON FUNCTION public.apply_correction_atomic(
  UUID, UUID, UUID, JSONB, JSONB, JSONB, JSONB, JSONB
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.apply_correction_atomic(
  UUID, UUID, UUID, JSONB, JSONB, JSONB, JSONB, JSONB
) TO authenticated, service_role;
