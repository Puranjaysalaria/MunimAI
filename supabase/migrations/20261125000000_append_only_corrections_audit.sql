-- ====================================================================
-- Munim AI - Append-Only Corrections, Audit Logs & Price History
-- Migration: 20261125000000_append_only_corrections_audit.sql
-- ====================================================================

-- 1. Extend transactions table for append-only corrections (never overwrite originals)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS previous_correction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_correction BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'voice' CHECK (source IN ('voice', 'tap')),
  ADD COLUMN IF NOT EXISTS has_sent_reminder BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS proof_original_amount NUMERIC(12, 2);

CREATE INDEX IF NOT EXISTS idx_transactions_parent_id ON public.transactions(parent_transaction_id);

-- 2. Audit Logs Table (immutable edit & undo trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('transaction', 'customer', 'item', 'supplier_order', 'reminder', 'bill_scan')),
    entity_id TEXT NOT NULL,
    previous_correction_id TEXT,
    action TEXT NOT NULL CHECK (action IN ('edit', 'undo', 'create', 'delete_proof')),
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL CHECK (actor_role IN ('owner', 'staff')),
    before_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    after_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    reason TEXT,
    source TEXT NOT NULL CHECK (source IN ('voice', 'tap')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_shop_id ON public.audit_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_own_shop" ON public.audit_logs;
CREATE POLICY "audit_logs_select_own_shop" ON public.audit_logs
    FOR SELECT USING (
        shop_id IN (SELECT shop_id FROM public.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "audit_logs_insert_own_shop" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_own_shop" ON public.audit_logs
    FOR INSERT WITH CHECK (
        shop_id IN (SELECT shop_id FROM public.users WHERE id = auth.uid())
    );

-- 3. Price History Table
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    price_type TEXT NOT NULL CHECK (price_type IN ('selling', 'cost')),
    old_price NUMERIC(10, 2) NOT NULL,
    new_price NUMERIC(10, 2) NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('voice', 'tap', 'bill_scan')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_shop_id ON public.price_history(shop_id);
CREATE INDEX IF NOT EXISTS idx_price_history_item_id ON public.price_history(item_id);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_history_select_own_shop" ON public.price_history;
CREATE POLICY "price_history_select_own_shop" ON public.price_history
    FOR SELECT USING (
        shop_id IN (SELECT shop_id FROM public.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "price_history_insert_own_shop" ON public.price_history;
CREATE POLICY "price_history_insert_own_shop" ON public.price_history
    FOR INSERT WITH CHECK (
        shop_id IN (SELECT shop_id FROM public.users WHERE id = auth.uid())
    );

-- 4. Atomic Server RPC for Append-Only Corrections (idempotent + optimistic conflict detection)
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
AS $$
DECLARE
    v_target RECORD;
    v_corr_id UUID := (p_correction_tx->>'id')::UUID;
    v_rev_id UUID := (p_reversal_tx->>'id')::UUID;
    v_cust JSONB;
    v_stk JSONB;
BEGIN
    IF p_shop_id <> public.auth_shop_id() THEN
        RAISE EXCEPTION 'Unauthorized shop_id';
    END IF;

    -- Idempotent replay check
    IF EXISTS (SELECT 1 FROM public.transactions WHERE id = v_corr_id) THEN
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

    -- Insert reversal and correction atomically
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

    -- Apply customer balance deltas
    FOR v_cust IN SELECT * FROM jsonb_array_elements(COALESCE(p_customer_deltas, '[]'::jsonb)) LOOP
        UPDATE public.customers
        SET balance_owed = GREATEST(0, balance_owed + (v_cust->>'delta')::NUMERIC),
            updated_at = now()
        WHERE id = (v_cust->>'customerId')::UUID AND shop_id = p_shop_id;
    END LOOP;

    -- Apply stock deltas
    FOR v_stk IN SELECT * FROM jsonb_array_elements(COALESCE(p_stock_deltas, '[]'::jsonb)) LOOP
        UPDATE public.items
        SET current_stock = GREATEST(0, current_stock - (v_stk->>'quantityDelta')::NUMERIC),
            updated_at = now()
        WHERE LOWER(name) = LOWER(v_stk->>'itemName') AND shop_id = p_shop_id;
    END LOOP;

    -- Insert immutable audit log
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
