-- Fix ambiguous column reference in append_schedule_history function
CREATE OR REPLACE FUNCTION public.append_schedule_history(
  p_schedule_id uuid, 
  p_team_member_id uuid, 
  p_action text, 
  p_from_status text, 
  p_to_status text, 
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_team_member_name TEXT;
  v_user_role TEXT;
  v_new_event JSONB;
BEGIN
  -- Buscar nome do team_member
  SELECT name INTO v_team_member_name
  FROM team_members
  WHERE id = p_team_member_id;

  -- Buscar role do usuário - FIXED: explicitly reference ur.role to avoid ambiguity
  SELECT ur.role::TEXT INTO v_user_role
  FROM user_roles ur
  JOIN team_members tm ON tm.user_id = ur.user_id
  WHERE tm.id = p_team_member_id;

  -- Montar evento
  v_new_event := jsonb_build_object(
    'timestamp', now(),
    'team_member_id', p_team_member_id,
    'team_member_name', v_team_member_name,
    'role', v_user_role,
    'action', p_action,
    'from_status', p_from_status,
    'to_status', p_to_status,
    'payload', p_payload
  );

  -- Append no array de history
  UPDATE schedules
  SET history = COALESCE(history, '[]'::jsonb) || v_new_event,
      updated_at = now()
  WHERE id = p_schedule_id;
END;
$function$;