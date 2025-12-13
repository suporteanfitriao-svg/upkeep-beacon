-- Remove old check constraint and add new one with 'released' status
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_status_check;

ALTER TABLE public.schedules ADD CONSTRAINT schedules_status_check 
CHECK (status IS NULL OR status IN ('waiting', 'released', 'cleaning', 'completed'));