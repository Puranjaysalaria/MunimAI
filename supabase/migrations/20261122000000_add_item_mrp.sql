-- Migration: Add mrp column to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS mrp NUMERIC(10, 2);

COMMENT ON COLUMN public.items.mrp IS 'Maximum Retail Price (printed on package)';
