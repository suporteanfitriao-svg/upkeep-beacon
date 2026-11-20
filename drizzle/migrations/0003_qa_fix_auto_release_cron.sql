-- lovable-cron-fallback-reviewed: replaces an existing per-minute job (same cadence) whose credentials were rejected; release times are minute-precise per schedule
DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobid FROM cron.job WHERE command ILIKE '%auto-release-schedules%' LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END $$;
SELECT cron.schedule(
  'auto-release-schedules-every-minute',
  '* * * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://itvnpqeymmcktqqohhsk.supabase.co/functions/v1/auto-release-schedules',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0dm5wcWV5bW1ja3RxcW9oaHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTg4OTEsImV4cCI6MjA4MTEzNDg5MX0.DuL9UXiQL-aCFEdZlluj6ihM-V_YNe9tUuxcYXThWOU"}'::jsonb,
    body := '{}'::jsonb
  );
  $cmd$
);