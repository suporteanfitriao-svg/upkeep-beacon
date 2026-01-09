-- Adicionar campos para o fluxo de status completo
ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS start_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS responsible_team_member_id UUID REFERENCES public.team_members(id),
ADD COLUMN IF NOT EXISTS important_info TEXT,
ADD COLUMN IF NOT EXISTS ack_by_team_members JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS checklist_loaded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_revert_reason TEXT;

-- Criar índice para filtrar schedules ativos
CREATE INDEX IF NOT EXISTS idx_schedules_is_active ON public.schedules(is_active);

-- Criar índice para buscar por responsável
CREATE INDEX IF NOT EXISTS idx_schedules_responsible ON public.schedules(responsible_team_member_id);

-- Função para registrar evento no histórico do schedule
CREATE OR REPLACE FUNCTION public.append_schedule_history(
  p_schedule_id UUID,
  p_team_member_id UUID,
  p_action TEXT,
  p_from_status TEXT,
  p_to_status TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_member_name TEXT;
  v_user_role TEXT;
  v_new_event JSONB;
BEGIN
  -- Buscar nome do team_member
  SELECT name INTO v_team_member_name
  FROM team_members
  WHERE id = p_team_member_id;

  -- Buscar role do usuário
  SELECT role::TEXT INTO v_user_role
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
$$;

-- Função para validar transição de status
CREATE OR REPLACE FUNCTION public.validate_schedule_status_transition(
  p_from_status TEXT,
  p_to_status TEXT,
  p_user_role TEXT,
  p_is_revert BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reversão somente por admin
  IF p_is_revert THEN
    RETURN p_user_role = 'admin';
  END IF;

  -- Fluxo permitido: waiting -> released -> cleaning -> completed
  IF p_from_status = 'waiting' AND p_to_status = 'released' THEN
    -- Somente manager ou admin podem liberar
    RETURN p_user_role IN ('manager', 'admin');
  END IF;

  IF p_from_status = 'released' AND p_to_status = 'cleaning' THEN
    -- Qualquer role pode iniciar limpeza
    RETURN p_user_role IN ('cleaner', 'manager', 'admin');
  END IF;

  IF p_from_status = 'cleaning' AND p_to_status = 'completed' THEN
    -- Qualquer role pode finalizar
    RETURN p_user_role IN ('cleaner', 'manager', 'admin');
  END IF;

  -- Qualquer outra transição não é permitida
  RETURN false;
END;
$$;