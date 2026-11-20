CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE member_record RECORD; r text;
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT id, role, selected_roles, user_id INTO member_record
  FROM public.team_members WHERE lower(email) = lower(NEW.email) AND is_active = true LIMIT 1;
  IF member_record IS NOT NULL AND (member_record.user_id IS NULL OR member_record.user_id = NEW.id) THEN
    UPDATE public.team_members SET user_id = NEW.id WHERE id = member_record.id;
    IF member_record.selected_roles IS NOT NULL AND array_length(member_record.selected_roles, 1) > 0 THEN
      FOREACH r IN ARRAY member_record.selected_roles LOOP
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r::app_role) ON CONFLICT (user_id, role) DO NOTHING;
      END LOOP;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, member_record.role) ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_new_user_role();