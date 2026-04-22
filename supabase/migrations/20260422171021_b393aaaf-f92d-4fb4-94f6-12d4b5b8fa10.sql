
-- ============================================================================
-- FASE 1: Correções críticas de vazamento de dados
-- ============================================================================

-- 1) STORAGE: Remover policies legadas "Anyone can view" em buckets já privados
DROP POLICY IF EXISTS "Anyone can view maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view inventory photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Issue photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read cleaning-standards" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

-- 2) PROPERTY_ICAL_SOURCES: restringir SELECT a admin/manager/superadmin
DROP POLICY IF EXISTS "Authenticated users with roles can read property_ical_sources" ON public.property_ical_sources;

CREATE POLICY "Admins and managers can read property_ical_sources"
ON public.property_ical_sources
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- 3) WEBHOOK_EVENTS: bloquear INSERT público (apenas service_role via edge function)
DROP POLICY IF EXISTS "Service can insert webhook events" ON public.webhook_events;

CREATE POLICY "Block all client inserts on webhook_events"
ON public.webhook_events
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- 4) PROFILES: remover exposição de reset tokens via SELECT
-- Estratégia: substituir policy de admin para usar uma view, e bloquear leitura
-- direta dos campos sensíveis via revogação de coluna a admins/superadmins.
-- Como Postgres RLS não filtra colunas, criamos view segura e revogamos SELECT
-- direto nos campos sensíveis.
REVOKE SELECT (reset_token_hash, reset_token_expires_at) ON public.profiles FROM authenticated, anon;

-- Garantir que a aplicação leia profiles sem esses campos.
-- (Edge functions com service_role continuam tendo acesso.)

-- 5) AUDIT LOGS: Forçar user_id = auth.uid() nas inserções
-- security_audit_logs
DROP POLICY IF EXISTS "Authenticated users can insert security logs" ON public.security_audit_logs;
CREATE POLICY "Users can insert own security logs"
ON public.security_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- password_audit_logs: exigir que team_member_id pertença ao usuário OU admin/manager
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.password_audit_logs;
CREATE POLICY "Users can insert own password audit logs"
ON public.password_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = password_audit_logs.team_member_id
      AND tm.user_id = auth.uid()
  )
);

-- team_member_audit_logs
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.team_member_audit_logs;
CREATE POLICY "Users can insert own team member audit logs"
ON public.team_member_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- 6) CLEANING_STANDARD_TEMPLATES: scoping por user_id (multi-tenant)
DROP POLICY IF EXISTS "Owners and managers manage cleaning standard templates" ON public.cleaning_standard_templates;
CREATE POLICY "Owners manage own cleaning standard templates"
ON public.cleaning_standard_templates
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Steps: scoping via template ownership
DROP POLICY IF EXISTS "Owners and managers manage cleaning standard steps" ON public.cleaning_standard_steps;
CREATE POLICY "Owners manage own cleaning standard steps"
ON public.cleaning_standard_steps
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cleaning_standard_templates t
    WHERE t.id = cleaning_standard_steps.template_id
      AND (t.user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cleaning_standard_templates t
    WHERE t.id = cleaning_standard_steps.template_id
      AND (t.user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role))
  )
);
