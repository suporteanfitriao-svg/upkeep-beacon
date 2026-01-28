-- ============================================================
-- SUBSCRIPTIONS & PLANS SYSTEM
-- Para gerenciamento de planos comerciais e liberação de acesso
-- ============================================================

-- Tabela de planos disponíveis
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_monthly numeric NOT NULL,
  max_properties integer NOT NULL DEFAULT 1,
  max_syncs_per_property integer NOT NULL DEFAULT 1,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inserir planos iniciais
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, max_properties, max_syncs_per_property, features) VALUES
(
  'Plano Básico',
  'basico',
  '1 propriedade com todas as funcionalidades',
  59.90,
  1,
  1,
  '["limpezas", "checklists", "inspecoes", "avarias", "notificacoes", "inventario"]'::jsonb
),
(
  'Plano Padrão',
  'padrao',
  'Até 3 propriedades com todas as funcionalidades',
  99.00,
  3,
  1,
  '["limpezas", "checklists", "inspecoes", "avarias", "notificacoes", "inventario", "multiplas_propriedades"]'::jsonb
);

-- Tabela de subscriptions de usuários
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'suspended')),
  -- Hotmart integration
  hotmart_transaction_id text UNIQUE,
  hotmart_subscription_id text,
  hotmart_product_id text,
  -- Dates
  started_at timestamp with time zone,
  expires_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  -- Metadata
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_hotmart_transaction ON public.subscriptions(hotmart_transaction_id);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS para planos (público para leitura, admin para gestão)
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins and superadmins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- RLS para subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins and superadmins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins and superadmins can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Função para verificar se usuário tem subscription ativa
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > now())
  )
$$;

-- Função para obter detalhes da subscription ativa
CREATE OR REPLACE FUNCTION public.get_active_subscription(p_user_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_id uuid,
  plan_name text,
  plan_slug text,
  max_properties integer,
  status text,
  expires_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id as subscription_id,
    s.plan_id,
    sp.name as plan_name,
    sp.slug as plan_slug,
    sp.max_properties,
    s.status,
    s.expires_at
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  LIMIT 1
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();