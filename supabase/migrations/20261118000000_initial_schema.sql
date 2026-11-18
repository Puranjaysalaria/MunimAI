-- ====================================================================
-- Munim AI - Kirana Ledger Initial Schema
-- Migration: 20261118000000_initial_schema.sql
-- ====================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Shops Table
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_phone TEXT NOT NULL UNIQUE,
    upi_id TEXT DEFAULT 'munimkirana@upi',
    pin_hash TEXT,
    settings JSONB DEFAULT '{"language": "hi", "currency": "INR", "sound_enabled": true, "credit_warning_limit": 1000}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Users Table (Shop Owner & Staff)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(shop_id, phone)
);

-- 4. Customers Table (Kirana buyers with Udhaar ledger)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'hi' CHECK (preferred_language IN ('hi', 'pa', 'en', 'mr', 'bn', 'gu', 'ta')),
    address_note TEXT,
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    balance_owed NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    trust_score INTEGER NOT NULL DEFAULT 85 CHECK (trust_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- 5. Items Table (Inventory & Synonyms)
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    synonyms TEXT[] NOT NULL DEFAULT '{}',
    unit TEXT NOT NULL DEFAULT 'kilo' CHECK (unit IN ('kilo', 'gram', 'litre', 'packet', 'piece', 'dabba', 'bori')),
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    min_threshold NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_shop_id ON public.items(shop_id);

-- 6. Transactions Table (Sales, Udhaar/Credit, Jama/Payment, Expenses)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sale', 'credit', 'payment', 'expense')),
    amount NUMERIC(12, 2) NOT NULL,
    items JSONB DEFAULT '[]'::jsonb, -- Array of {item_id, item_name, quantity, unit, price}
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_by_voice BOOLEAN NOT NULL DEFAULT false,
    proof_clip_path TEXT,
    voice_transcript TEXT,
    client_sync_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_shop_id ON public.transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

-- 7. Stock Movements Table
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    quantity_change NUMERIC(10, 2) NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'purchase', 'adjustment', 'damage')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_shop_id ON public.stock_movements(shop_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON public.stock_movements(item_id);

-- 8. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_shop_id ON public.suppliers(shop_id);

-- 9. Supplier Orders Table
CREATE TABLE IF NOT EXISTS public.supplier_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_estimated NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_orders_shop_id ON public.supplier_orders(shop_id);

-- 10. Reminders Table (Udhaar recovery reminders)
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    message_text TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'hi',
    upi_link TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'paid')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_shop_id ON public.reminders(shop_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Helper function: get shop_id of current authenticated user
CREATE OR REPLACE FUNCTION public.auth_shop_id()
RETURNS UUID AS $$
    SELECT shop_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Shops RLS: Only owner or staff of that shop can see or update their shop
CREATE POLICY shop_access_policy ON public.shops
    FOR ALL
    USING (id = public.auth_shop_id())
    WITH CHECK (id = public.auth_shop_id());

-- Users RLS
CREATE POLICY users_access_policy ON public.users
    FOR ALL
    USING (shop_id = public.auth_shop_id())
    WITH CHECK (shop_id = public.auth_shop_id());

-- Customers RLS
CREATE POLICY customers_access_policy ON public.customers
    FOR ALL
    USING (shop_id = public.auth_shop_id())
    WITH CHECK (shop_id = public.auth_shop_id());

-- Items RLS
CREATE POLICY items_access_policy ON public.items
    FOR ALL
    USING (shop_id = public.auth_shop_id())
    WITH CHECK (shop_id = public.auth_shop_id());

-- Transactions RLS
CREATE POLICY transactions_access_policy ON public.transactions
    FOR ALL
    USING (shop_id = public.auth_shop_id())
    WITH CHECK (shop_id = public.auth_shop_id());

-- Stock Movements RLS
CREATE POLICY stock_movements_access_policy ON public.stock_movements
    FOR ALL
    USING (shop_id = public.auth_shop_id())
    WITH CHECK (shop_id = public.auth_shop_id());

-- Suppliers RLS
CREATE POLICY suppliers_access_policy ON public.suppliers
    FOR ALL
    USING (shop_id = public.auth_shop_id())
    WITH CHECK (shop_id = public.auth_shop_id());

-- Supplier Orders RLS
CREATE POLICY supplier_orders_access_policy ON public.supplier_orders
    FOR ALL
    USING (shop_id = public.auth_shop_id())
    WITH CHECK (shop_id = public.auth_shop_id());

-- Reminders RLS
CREATE POLICY reminders_access_policy ON public.reminders
    FOR ALL
    USING (shop_id = public.auth_shop_id())
    WITH CHECK (shop_id = public.auth_shop_id());

-- ====================================================================
-- STORAGE BUCKET FOR PROOF AUDIO CLIPS
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-clips', 'proof-clips', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: only authenticated users who own the shop folder can upload or read
CREATE POLICY "Shop owners can read their own proof audio" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'proof-clips' AND (storage.foldername(name))[1] = public.auth_shop_id()::text);

CREATE POLICY "Shop owners can upload proof audio" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'proof-clips' AND (storage.foldername(name))[1] = public.auth_shop_id()::text);
