-- Create function to handle new user registration and role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  member_record RECORD;
BEGIN
  -- Find matching team member by email
  SELECT id, role INTO member_record
  FROM public.team_members
  WHERE email = NEW.email AND is_active = true;
  
  IF member_record IS NOT NULL THEN
    -- Link user_id to team_members table
    UPDATE public.team_members
    SET user_id = NEW.id
    WHERE id = member_record.id;
    
    -- Create user_roles entry
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, member_record.role);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();