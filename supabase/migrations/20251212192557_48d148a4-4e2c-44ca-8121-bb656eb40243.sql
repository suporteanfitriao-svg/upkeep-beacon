-- Tabela de propriedades com URL do calendário iCal do Airbnb
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  airbnb_ical_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de reservas importadas do Airbnb
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  external_id TEXT, -- UID do evento iCal
  guest_name TEXT,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE NOT NULL,
  summary TEXT,
  description TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, external_id)
);

-- Tabela de agendamentos de limpeza (schedules)
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  property_name TEXT NOT NULL,
  property_address TEXT,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out_time TIMESTAMP WITH TIME ZONE NOT NULL,
  guest_name TEXT,
  cleaner_name TEXT,
  cleaner_avatar TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'cleaning', 'inspection', 'completed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  estimated_duration INTEGER DEFAULT 120,
  notes TEXT,
  maintenance_status TEXT DEFAULT 'ok' CHECK (maintenance_status IN ('ok', 'needs_maintenance', 'in_progress')),
  maintenance_issues JSONB DEFAULT '[]'::jsonb,
  checklists JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para leitura (sem autenticação por enquanto)
CREATE POLICY "Allow public read properties" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Allow public insert properties" ON public.properties FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update properties" ON public.properties FOR UPDATE USING (true);
CREATE POLICY "Allow public delete properties" ON public.properties FOR DELETE USING (true);

CREATE POLICY "Allow public read reservations" ON public.reservations FOR SELECT USING (true);
CREATE POLICY "Allow public insert reservations" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reservations" ON public.reservations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete reservations" ON public.reservations FOR DELETE USING (true);

CREATE POLICY "Allow public read schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Allow public insert schedules" ON public.schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update schedules" ON public.schedules FOR UPDATE USING (true);
CREATE POLICY "Allow public delete schedules" ON public.schedules FOR DELETE USING (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();