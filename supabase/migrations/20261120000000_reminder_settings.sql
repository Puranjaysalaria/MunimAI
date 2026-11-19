-- ====================================================================
-- Munim AI - Reminder Settings & Safety Rules Migration
-- Migration: 20261120000000_reminder_settings.sql
-- ====================================================================

-- 1. Add Reminder Safety Fields to Customers Table
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS do_not_remind BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS reminder_tone_override TEXT CHECK (reminder_tone_override IN ('polite', 'standard', 'firm')),
    ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;

-- 2. Extend preferred_language constraint to support all 10 Indian languages
ALTER TABLE public.customers
    DROP CONSTRAINT IF EXISTS customers_preferred_language_check;

ALTER TABLE public.customers
    ADD CONSTRAINT customers_preferred_language_check
    CHECK (preferred_language IN ('hi', 'pa', 'en', 'mr', 'bn', 'gu', 'ta', 'te', 'kn', 'ml'));

-- 3. Performance Indexes for Daily Cap & Safety Filtering
CREATE INDEX IF NOT EXISTS idx_customers_last_reminded_at ON public.customers(last_reminded_at);
CREATE INDEX IF NOT EXISTS idx_customers_do_not_remind ON public.customers(do_not_remind);

-- 4. Note on RLS: Existing Row Level Security (RLS) on public.customers
--    (customers_access_policy: shop_id = public.auth_shop_id())
--    and public.shops (shop_access_policy) automatically governs all new columns
--    and the JSONB reminder_settings configuration.
