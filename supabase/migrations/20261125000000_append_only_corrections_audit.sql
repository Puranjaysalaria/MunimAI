-- ====================================================================
-- Munim AI - Append-Only Corrections, Audit Logs & Price History
-- Migration: 20261125000000_append_only_corrections_audit.sql
-- ====================================================================

-- 1. Extend transactions table for append-only corrections (never overwrite originals)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
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
