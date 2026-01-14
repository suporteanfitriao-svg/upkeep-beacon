-- Create inspections table
CREATE TABLE public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  property_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  checklist_id UUID REFERENCES public.property_checklists(id) ON DELETE SET NULL,
  checklist_state JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  completed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all inspections"
ON public.inspections
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create inspections"
ON public.inspections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update inspections"
ON public.inspections
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Users can delete inspections"
ON public.inspections
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_inspections_updated_at
BEFORE UPDATE ON public.inspections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();