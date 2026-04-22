
-- ============================================================================
-- FASE 3: Column-Level Security (revoke SELECT em colunas sensíveis para cleaner)
-- ============================================================================

-- 1) properties.global_access_password e properties.airbnb_ical_url
--    Apenas admin/manager/superadmin leem direto. Cleaner usa RPC get_property_password.
REVOKE SELECT (global_access_password, airbnb_ical_url) ON public.properties FROM authenticated, anon;

GRANT SELECT (global_access_password, airbnb_ical_url) ON public.properties TO authenticator;
-- ^ authenticator é o owner role; permite que GRANT condicional funcione via security definer.

-- Como GRANT por role customizado não diferencia 'cleaner' de 'admin' (ambos são authenticated),
-- a estratégia segura é: revogar de authenticated e expor via SECURITY DEFINER functions.
-- get_property_password() já existe. Para airbnb_ical_url, criar função similar:

CREATE OR REPLACE FUNCTION public.get_property_ical_url(p_property_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
BEGIN
  -- Apenas admin/manager/superadmin
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  ) THEN
    RETURN NULL;
  END IF;

  SELECT airbnb_ical_url INTO v_url
  FROM properties
  WHERE id = p_property_id;

  RETURN v_url;
END;
$$;

-- Função para admin/manager lerem global_access_password
CREATE OR REPLACE FUNCTION public.get_property_global_password(p_property_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pwd text;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  ) THEN
    RETURN NULL;
  END IF;

  SELECT global_access_password INTO v_pwd
  FROM properties
  WHERE id = p_property_id;

  RETURN v_pwd;
END;
$$;

-- 2) schedules.access_password
REVOKE SELECT (access_password) ON public.schedules FROM authenticated, anon;
-- get_schedule_password() já existe e cleaners autorizados a leem por lá.

-- 3) Realtime: tightening — exigir property assignment
DROP POLICY IF EXISTS "Authenticated users read own scope realtime" ON realtime.messages;
CREATE POLICY "Active team members read realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (
        tm.has_all_properties = true
        OR EXISTS (
          SELECT 1 FROM public.team_member_properties tmp
          WHERE tmp.team_member_id = tm.id
        )
      )
  )
);
