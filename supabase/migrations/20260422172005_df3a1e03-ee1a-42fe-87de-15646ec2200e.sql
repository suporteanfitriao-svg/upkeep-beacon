
-- Drop policies recursivas em team_members
DROP POLICY IF EXISTS "Managers can read team members of accessible properties" ON public.team_members;
DROP POLICY IF EXISTS "Cleaners can read own team member record" ON public.team_members;
DROP POLICY IF EXISTS "Admins and superadmins can read all team members" ON public.team_members;

-- Função auxiliar SECURITY DEFINER (bypassa RLS) para checar se o membro pertence ao escopo do usuário atual
CREATE OR REPLACE FUNCTION public.user_can_view_team_member(p_team_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admin / superadmin: tudo
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
    -- Próprio registro
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = p_team_member_id AND tm.user_id = auth.uid()
    )
    -- Manager: membro tem has_all_properties OU compartilha alguma propriedade acessível
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND (
        EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.id = p_team_member_id AND tm.has_all_properties = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.team_member_properties tmp
          WHERE tmp.team_member_id = p_team_member_id
            AND public.has_property_access(tmp.property_id)
        )
      )
    )
$$;

-- Policy única, não recursiva
CREATE POLICY "Scoped read on team_members"
ON public.team_members
FOR SELECT
TO authenticated
USING (public.user_can_view_team_member(id));
