-- Add new columns to inventory_items for quantity, unit and details
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS details TEXT;

-- Add description column to inventory_categories
ALTER TABLE public.inventory_categories 
ADD COLUMN IF NOT EXISTS description TEXT;