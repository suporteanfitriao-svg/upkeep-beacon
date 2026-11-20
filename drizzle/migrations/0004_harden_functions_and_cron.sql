CREATE TABLE IF NOT EXISTS public.internal_cron_secrets (name text PRIMARY KEY, value text NOT NULL);
GRANT ALL ON public.internal_cron_secrets TO service_role;
REVOKE ALL ON public.internal_cron_secrets FROM anon, authenticated;
ALTER TABLE public.internal_cron_secrets ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_cron_secrets(name, value)
VALUES ('sync_ical', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_active_subscription(p_user_id uuid)
 RETURNS TABLE(subscription_id uuid, plan_id uuid, plan_name text, plan_slug text, max_properties integer, status text, expires_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.id, s.plan_id, sp.name, sp.slug, sp.max_properties, s.status, s.expires_at
  FROM public.subscriptions s JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id
    AND (p_user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role))
    AND s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now())
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND (p_user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role))
      AND s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now()))
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND (_user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role)))
$$;

CREATE OR REPLACE FUNCTION public.is_schedule_completed(p_schedule_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.schedules s WHERE s.id = p_schedule_id AND s.status = 'completed'
    AND (has_role(auth.uid(), 'superadmin'::app_role) OR is_owner_of_property(s.property_id) OR has_property_access(s.property_id)))
$$;

CREATE OR REPLACE FUNCTION public.waitlist_dedupe()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  IF EXISTS (SELECT 1 FROM public.waitlist WHERE email = NEW.email AND created_at > now() - interval '24 hours') THEN
    RAISE EXCEPTION 'duplicate waitlist submission';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.waitlist_dedupe() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_waitlist_dedupe ON public.waitlist;
CREATE TRIGGER trg_waitlist_dedupe BEFORE INSERT ON public.waitlist FOR EACH ROW EXECUTE FUNCTION public.waitlist_dedupe();
DROP POLICY IF EXISTS "Public can submit to waitlist with validation" ON public.waitlist;
CREATE POLICY "Public can submit to waitlist with validation" ON public.waitlist FOR INSERT TO anon, authenticated
WITH CHECK ((email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') AND length(email) <= 255 AND length(name) <= 100 AND length(whatsapp) <= 20);
DROP FUNCTION IF EXISTS public.can_submit_to_waitlist(text);

REVOKE EXECUTE ON FUNCTION public.get_active_subscription(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_schedule_completed(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_property_global_password(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_property_ical_url(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_property_password(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_schedule_password(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_subscription(uuid), public.has_active_subscription(uuid), public.has_any_role(uuid), public.is_schedule_completed(uuid), public.get_property_global_password(uuid), public.get_property_ical_url(uuid), public.get_property_password(uuid, uuid), public.get_schedule_password(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_team_member_fields()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR has_role(auth.uid(), 'superadmin'::app_role) OR OLD.owner_user_id = auth.uid() THEN
    RETURN NEW;
  END IF;
  IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not allowed to change team member ownership or login link';
  END IF;
  IF OLD.user_id = auth.uid() AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.selected_roles IS DISTINCT FROM OLD.selected_roles OR NEW.has_all_properties IS DISTINCT FROM OLD.has_all_properties) THEN
    RAISE EXCEPTION 'Not allowed to change your own role or access';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.protect_team_member_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_team_member_fields ON public.team_members;
CREATE TRIGGER trg_protect_team_member_fields BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.protect_team_member_fields();