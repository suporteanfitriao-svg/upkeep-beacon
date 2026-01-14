-- Add property_id to inventory_categories to link inventory to specific properties
ALTER TABLE public.inventory_categories 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_categories_property_id ON public.inventory_categories(property_id);