-- ============================================================
-- 1. owner_profiles: dados fiscais do proprietário
-- ============================================================
CREATE TABLE public.owner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  document_type text NOT NULL DEFAULT 'cpf' CHECK (document_type IN ('cpf', 'cnpj')),
  document_number text NOT NULL,
  legal_name text NOT NULL,
  trade_name text,
  billing_email text,
  billing_phone text,
  billing_address text,
  billing_city text,
  billing_state text,
  billing_cep text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_type, document_number)
);

ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own fiscal profile"
  ON public.owner_profiles FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Owners update own fiscal profile"
  ON public.owner_profiles FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins manage fiscal profiles"
  ON public.owner_profiles FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_owner_profiles_updated_at
  BEFORE UPDATE ON public.owner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. owner_user_id em properties e team_members
-- ============================================================
ALTER TABLE public.properties
  ADD COLUMN owner_user_id uuid;

ALTER TABLE public.team_members
  ADD COLUMN owner_user_id uuid;

-- Backfill: vincular tudo que já existe ao primeiro superadmin (ou primeiro admin)
DO $$
DECLARE
  v_default_owner uuid;
BEGIN
  SELECT user_id INTO v_default_owner
  FROM public.user_roles
  WHERE role = 'superadmin'
  ORDER BY created_at
  LIMIT 1;

  IF v_default_owner IS NULL THEN
    SELECT user_id INTO v_default_owner
    FROM public.user_roles
    WHERE role = 'admin'
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_default_owner IS NOT NULL THEN
    UPDATE public.properties SET owner_user_id = v_default_owner WHERE owner_user_id IS NULL;
    UPDATE public.team_members SET owner_user_id = v_default_owner WHERE owner_user_id IS NULL;
  END IF;
END $$;

CREATE INDEX idx_properties_owner_user_id ON public.properties(owner_user_id);
CREATE INDEX idx_team_members_owner_user_id ON public.team_members(owner_user_id);

-- ============================================================
-- 3. Helpers de tenant
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_owner_user_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN auth.uid()
    ELSE (
      SELECT owner_user_id FROM public.team_members
      WHERE user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_owner_of_property(p_property_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id AND owner_user_id = auth.uid()
  );
$$;

-- ============================================================
-- 4. Trigger: auto-preenche owner_user_id em properties
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_property_owner_user_id()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_user_id IS NULL THEN
    NEW.owner_user_id := public.get_my_owner_user_id();
  END IF;

  IF NEW.owner_user_id IS NULL AND NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Property must have an owner_user_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER set_property_owner_before_insert
  BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_property_owner_user_id();

-- ============================================================
-- 5. Trigger: auto-preenche owner_user_id em team_members
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_team_member_owner_user_id()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_user_id IS NULL THEN
    NEW.owner_user_id := public.get_my_owner_user_id();
  END IF;

  IF NEW.owner_user_id IS NULL AND NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Team member must have an owner_user_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER set_team_member_owner_before_insert
  BEFORE INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_team_member_owner_user_id();

-- ============================================================
-- 6. Trigger: bloqueia vínculo cross-tenant em team_member_properties
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_team_member_property_tenant()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_owner uuid;
  v_property_owner uuid;
BEGIN
  SELECT owner_user_id INTO v_member_owner FROM public.team_members WHERE id = NEW.team_member_id;
  SELECT owner_user_id INTO v_property_owner FROM public.properties WHERE id = NEW.property_id;

  IF v_member_owner IS DISTINCT FROM v_property_owner THEN
    RAISE EXCEPTION 'Cross-tenant violation: team member and property belong to different owners';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_tmp_tenant_before_insert
  BEFORE INSERT OR UPDATE ON public.team_member_properties
  FOR EACH ROW EXECUTE FUNCTION public.validate_team_member_property_tenant();

-- ============================================================
-- 7. RLS — properties (substitui as policies existentes)
-- ============================================================
DROP POLICY IF EXISTS "Users can read properties based on access" ON public.properties;
DROP POLICY IF EXISTS "Users can update properties based on access" ON public.properties;
DROP POLICY IF EXISTS "Managers admins and superadmins can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Admins and superadmins can delete properties" ON public.properties;

CREATE POLICY "Tenant: read properties"
  ON public.properties FOR SELECT
  USING (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR owner_user_id = auth.uid()
    OR (owner_user_id = public.get_my_owner_user_id() AND has_property_access(id))
  );

CREATE POLICY "Tenant: insert properties"
  ON public.properties FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Tenant: update properties"
  ON public.properties FOR UPDATE
  USING (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR owner_user_id = auth.uid()
  );

CREATE POLICY "Tenant: delete properties"
  ON public.properties FOR DELETE
  USING (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR owner_user_id = auth.uid()
  );

-- ============================================================
-- 8. RLS — team_members (mantém leitura existente, adiciona INSERT/UPDATE/DELETE por tenant)
-- ============================================================
-- Anfitrião pode INSERIR apenas cleaners do mesmo owner
CREATE POLICY "Manager can insert cleaners in own tenant"
  ON public.team_members FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND role = 'cleaner'::app_role
      AND owner_user_id = public.get_my_owner_user_id()
    )
  );

CREATE POLICY "Tenant: update team members"
  ON public.team_members FOR UPDATE
  USING (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR owner_user_id = auth.uid()
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND owner_user_id = public.get_my_owner_user_id()
      AND role = 'cleaner'::app_role
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Tenant: delete team members"
  ON public.team_members FOR DELETE
  USING (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR owner_user_id = auth.uid()
  );

-- ============================================================
-- 9. RLS — team_member_properties (anfitrião pode vincular cleaners do mesmo owner aos imóveis sob gestão)
-- ============================================================
CREATE POLICY "Manager can link cleaners to managed properties"
  ON public.team_member_properties FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_user_id = auth.uid()
    )
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND has_property_access(property_id)
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.id = team_member_id
          AND tm.role = 'cleaner'::app_role
          AND tm.owner_user_id = public.get_my_owner_user_id()
      )
    )
  );

CREATE POLICY "Manager can unlink cleaners from managed properties"
  ON public.team_member_properties FOR DELETE
  USING (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_user_id = auth.uid()
    )
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND has_property_access(property_id)
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.id = team_member_id
          AND tm.role = 'cleaner'::app_role
          AND tm.owner_user_id = public.get_my_owner_user_id()
      )
    )
  );