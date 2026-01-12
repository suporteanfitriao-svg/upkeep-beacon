-- Add progress_notes field to store observations with timestamps
ALTER TABLE public.maintenance_issues 
ADD COLUMN IF NOT EXISTS progress_notes JSONB DEFAULT '[]'::jsonb;

-- Add started_at field to track when issue was set to in_progress
ALTER TABLE public.maintenance_issues 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;