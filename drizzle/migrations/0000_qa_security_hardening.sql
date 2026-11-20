DROP POLICY IF EXISTS "Authenticated users can update checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update cleaning standards" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update inventory photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update issue photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view checklist photos" ON storage.objects;

CREATE OR REPLACE FUNCTION public.can_access_schedule_folder(p_folder text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pid uuid;
BEGIN
  IF p_folder !~ '^[0-9a-fA-F-]{36}$' THEN RETURN false; END IF;
  SELECT property_id INTO v_pid FROM schedules WHERE id = p_folder::uuid;
  IF v_pid IS NULL THEN RETURN false; END IF;
  RETURN has_property_access(v_pid) OR is_owner_of_property(v_pid);
END $$;
REVOKE EXECUTE ON FUNCTION public.can_access_schedule_folder(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_schedule_folder(text) TO authenticated;

CREATE POLICY "Schedule-scoped read on checklist photos" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'checklist-photos' AND public.can_access_schedule_folder((storage.foldername(name))[1]));

DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef AND p.proname <> 'can_submit_to_waitlist'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
  END LOOP;
END $$;