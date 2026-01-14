-- Create inventory item history table
CREATE TABLE public.inventory_item_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT,
  action TEXT NOT NULL, -- 'created', 'updated', 'photo_added', 'photo_removed'
  changes JSONB, -- Store what changed: { field: { old: value, new: value } }
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_item_history ENABLE ROW LEVEL SECURITY;

-- Policies for inventory_item_history
CREATE POLICY "Users can view item history" 
ON public.inventory_item_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.inventory_items ii
    JOIN public.inventory_categories ic ON ii.category_id = ic.id
    WHERE ii.id = inventory_item_history.item_id
    AND ic.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create item history" 
ON public.inventory_item_history 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inventory_items ii
    JOIN public.inventory_categories ic ON ii.category_id = ic.id
    WHERE ii.id = inventory_item_history.item_id
    AND ic.user_id = auth.uid()
  )
);

-- Index for faster queries
CREATE INDEX idx_inventory_item_history_item_id ON public.inventory_item_history(item_id);
CREATE INDEX idx_inventory_item_history_created_at ON public.inventory_item_history(created_at DESC);

-- Add original_checklist_state to inspections for reset functionality
ALTER TABLE public.inspections 
ADD COLUMN IF NOT EXISTS original_checklist_state JSONB;