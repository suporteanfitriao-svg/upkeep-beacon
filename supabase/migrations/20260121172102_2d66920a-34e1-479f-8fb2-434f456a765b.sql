-- Add history and started_at columns to inspections table
ALTER TABLE public.inspections 
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS verification_comment text;