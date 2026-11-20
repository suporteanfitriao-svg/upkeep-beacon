CREATE OR REPLACE FUNCTION public.can_manage_property(p_property_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_role(auth.uid(), 'superadmin'::app_role)
    OR is_owner_of_property(p_property_id)
    OR (has_role(auth.uid(), 'manager'::app_role) AND has_property_access(p_property_id))
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_property(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_property(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_property_global_password(p_property_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_pwd text;
BEGIN
  IF NOT can_manage_property(p_property_id) THEN RETURN NULL; END IF;
  SELECT global_access_password INTO v_pwd FROM properties WHERE id = p_property_id;
  RETURN v_pwd;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_property_ical_url(p_property_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_url text;
BEGIN
  IF NOT can_manage_property(p_property_id) THEN RETURN NULL; END IF;
  SELECT airbnb_ical_url INTO v_url FROM properties WHERE id = p_property_id;
  RETURN v_url;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_property_password(p_property_id uuid, p_schedule_id uuid DEFAULT NULL::uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_password_mode property_password_mode; v_global_password text; v_schedule_password text; v_team_member_id uuid;
BEGIN
  SELECT password_mode, global_access_password INTO v_password_mode, v_global_password FROM properties WHERE id = p_property_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT (can_manage_property(p_property_id) OR has_property_access(p_property_id)) THEN RETURN NULL; END IF;
  IF p_schedule_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM schedules WHERE id = p_schedule_id AND property_id = p_property_id) THEN
    RETURN NULL;
  END IF;
  SELECT id INTO v_team_member_id FROM team_members WHERE user_id = auth.uid() LIMIT 1;
  INSERT INTO password_audit_logs (schedule_id, property_id, team_member_id, action)
  VALUES (p_schedule_id, p_property_id, v_team_member_id, 'property_password_viewed');
  IF v_password_mode = 'global' THEN RETURN v_global_password;
  ELSIF v_password_mode IN ('ical','manual') AND p_schedule_id IS NOT NULL THEN
    SELECT access_password INTO v_schedule_password FROM schedules WHERE id = p_schedule_id;
    RETURN v_schedule_password;
  END IF;
  RETURN NULL;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_schedule_password(p_schedule_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_password text; v_property_id uuid; v_status text; v_checkout_date date; v_team_member_id uuid;
BEGIN
  SELECT access_password, property_id, status, (check_out_time::date)
  INTO v_password, v_property_id, v_status, v_checkout_date FROM schedules WHERE id = p_schedule_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT id INTO v_team_member_id FROM team_members WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  IF can_manage_property(v_property_id) THEN
    INSERT INTO password_audit_logs (schedule_id, property_id, team_member_id, action)
    VALUES (p_schedule_id, v_property_id, v_team_member_id, 'password_viewed');
    RETURN v_password;
  END IF;
  IF v_team_member_id IS NULL THEN RETURN NULL; END IF;
  IF has_property_access(v_property_id) AND (v_status IN ('released','cleaning') OR (v_checkout_date = CURRENT_DATE AND v_status <> 'completed')) THEN
    INSERT INTO password_audit_logs (schedule_id, property_id, team_member_id, action)
    VALUES (p_schedule_id, v_property_id, v_team_member_id, 'password_viewed');
    RETURN v_password;
  END IF;
  RETURN NULL;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_active_subscription(p_user_id uuid)
RETURNS TABLE(subscription_id uuid, plan_id uuid, plan_name text, plan_slug text, max_properties integer, status text, expires_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT s.id, s.plan_id, sp.name, sp.slug, sp.max_properties, s.status, s.expires_at
  FROM public.subscriptions s JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id
    AND (p_user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role) OR auth.uid() IS NULL)
    AND s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now())
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND (p_user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role) OR auth.uid() IS NULL)
      AND s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now())
  )
$function$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND (_user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role) OR auth.uid() IS NULL))
$function$;

CREATE OR REPLACE FUNCTION public.is_schedule_completed(p_schedule_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (SELECT 1 FROM public.schedules s WHERE s.id = p_schedule_id AND s.status = 'completed'
    AND (auth.uid() IS NULL OR has_role(auth.uid(), 'superadmin'::app_role) OR is_owner_of_property(s.property_id) OR has_property_access(s.property_id)))
$function$;