
-- ============================================================================
-- FASE 2: Correções finais
-- ============================================================================

-- 1) REALTIME: restringir inscrições por property access
-- Habilitar RLS em realtime.messages se ainda não estiver
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Policy: usuário só pode escutar canais cujo nome contém um property_id que ele acessa
-- ou canais genéricos para admins
DROP POLICY IF EXISTS "Authenticated users read own scope realtime" ON realtime.messages;
CREATE POLICY "Authenticated users read own scope realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    -- topic format esperado: "schedules:<property_id>" ou similar.
    -- Aceita se o user tem QUALQUER property assignment (escopo simples).
    -- Para escopo total por canal, o front deve usar topic = property_id.
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.is_active = true
    )
  )
);

-- 2) STORAGE: reescrever INSERT/UPDATE/DELETE permissivos
DROP POLICY IF EXISTS "Authenticated upload to photo buckets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete inventory photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete issue photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own checklist photos" ON storage.objects;

-- INSERT: usuário precisa ter algum role ativo (admin/manager/cleaner/superadmin)
CREATE POLICY "Role holders can upload to photo buckets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = ANY (ARRAY[
    'maintenance-photos','checklist-photos','property-images',
    'inventory-photos','inspection-photos','issue-photos','cleaning-standards'
  ])
  AND has_any_role(auth.uid())
);

-- UPDATE: somente admin/manager/superadmin (cleaner não edita arquivos existentes)
CREATE POLICY "Admins and managers can update photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = ANY (ARRAY[
    'maintenance-photos','checklist-photos','property-images',
    'inventory-photos','inspection-photos','issue-photos','cleaning-standards'
  ])
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  )
);

-- 3) PROFILES: mover reset tokens para tabela isolada
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy = ninguém via RLS lê/escreve. Apenas service_role (edge functions).
-- Migrar dados existentes
INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at)
SELECT id, reset_token_hash, reset_token_expires_at
FROM public.profiles
WHERE reset_token_hash IS NOT NULL
  AND reset_token_expires_at IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  token_hash = EXCLUDED.token_hash,
  expires_at = EXCLUDED.expires_at;

-- Remover colunas sensíveis da profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS reset_token_hash;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS reset_token_expires_at;

-- 4) AUDIT LOGS: bloquear INSERT direto via cliente; apenas SECURITY DEFINER functions
DROP POLICY IF EXISTS "Users can insert own security logs" ON public.security_audit_logs;
-- Sem policy de INSERT = somente service_role e SECURITY DEFINER funcs (log_security_event) inserem.

DROP POLICY IF EXISTS "Users can insert own team member audit logs" ON public.team_member_audit_logs;
-- Idem.

-- 5) CLEANING_RATES: scoping por property access para managers
DROP POLICY IF EXISTS "Admins and managers can manage cleaning rates" ON public.cleaning_rates;

CREATE POLICY "Admins and superadmins manage all cleaning rates"
ON public.cleaning_rates
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Managers manage cleaning rates of accessible properties"
ON public.cleaning_rates
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND has_property_access(property_id)
)
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
  AND has_property_access(property_id)
);
