-- Add selected_roles column to store multiple roles per team member
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS selected_roles text[] DEFAULT NULL;

-- Backfill existing members with their current single role
UPDATE public.team_members 
SET selected_roles = ARRAY[role::text] 
WHERE selected_roles IS NULL;

-- Update handle_new_user_role trigger to create multiple user_roles entries
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  member_record RECORD;
  r text;
BEGIN
  SELECT id, role, selected_roles INTO member_record
  FROM public.team_members
  WHERE email = NEW.email AND is_active = true;
  
  IF member_record IS NOT NULL THEN
    UPDATE public.team_members
    SET user_id = NEW.id
    WHERE id = member_record.id;
    
    IF member_record.selected_roles IS NOT NULL AND array_length(member_record.selected_roles, 1) > 0 THEN
      FOREACH r IN ARRAY member_record.selected_roles
      LOOP
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, r::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
      END LOOP;
    ELSE
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, member_record.role);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;