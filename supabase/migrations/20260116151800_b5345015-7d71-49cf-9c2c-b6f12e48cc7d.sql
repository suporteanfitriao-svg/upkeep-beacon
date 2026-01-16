-- Enable realtime for schedules table
ALTER TABLE public.schedules REPLICA IDENTITY FULL;

-- Add schedules to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;