-- Create maintenance_issues table
CREATE TABLE public.maintenance_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  property_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  reported_by UUID REFERENCES auth.users(id),
  reported_by_name TEXT,
  assigned_to UUID REFERENCES public.team_members(id),
  assigned_to_name TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_by_name TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and managers can manage all maintenance issues"
ON public.maintenance_issues
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Cleaners can read maintenance issues for assigned properties"
ON public.maintenance_issues
FOR SELECT
USING (
  has_role(auth.uid(), 'cleaner'::app_role) AND 
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND (
      tm.has_all_properties = true OR 
      EXISTS (
        SELECT 1 FROM team_member_properties tmp
        WHERE tmp.team_member_id = tm.id 
        AND tmp.property_id = maintenance_issues.property_id
      )
    )
  )
);

CREATE POLICY "Cleaners can insert maintenance issues for assigned properties"
ON public.maintenance_issues
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'cleaner'::app_role) AND 
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND (
      tm.has_all_properties = true OR 
      EXISTS (
        SELECT 1 FROM team_member_properties tmp
        WHERE tmp.team_member_id = tm.id 
        AND tmp.property_id = maintenance_issues.property_id
      )
    )
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_maintenance_issues_updated_at
BEFORE UPDATE ON public.maintenance_issues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_maintenance_issues_status ON public.maintenance_issues(status);
CREATE INDEX idx_maintenance_issues_property ON public.maintenance_issues(property_id);
CREATE INDEX idx_maintenance_issues_created ON public.maintenance_issues(created_at DESC);