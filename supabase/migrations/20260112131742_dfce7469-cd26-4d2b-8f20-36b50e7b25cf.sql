-- Table for storing cleaning rates per property per cleaner
CREATE TABLE public.cleaning_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  rate_value DECIMAL(10,2) NOT NULL CHECK (rate_value >= 0),
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, team_member_id)
);

-- Enable RLS
ALTER TABLE public.cleaning_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cleaning_rates
-- Admins and managers can manage all rates
CREATE POLICY "Admins and managers can manage cleaning rates"
ON public.cleaning_rates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Cleaners can only read their own required rates (for payment card display)
CREATE POLICY "Cleaners can read own required rates"
ON public.cleaning_rates
FOR SELECT
USING (
  has_role(auth.uid(), 'cleaner'::app_role) 
  AND is_required = true
  AND EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.id = cleaning_rates.team_member_id 
    AND tm.user_id = auth.uid()
  )
);

-- Audit log table for rate changes
CREATE TABLE public.cleaning_rate_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaning_rate_id UUID REFERENCES public.cleaning_rates(id) ON DELETE SET NULL,
  property_id UUID NOT NULL,
  team_member_id UUID NOT NULL,
  user_id UUID NOT NULL,
  previous_rate_value DECIMAL(10,2),
  new_rate_value DECIMAL(10,2) NOT NULL,
  previous_is_required BOOLEAN,
  new_is_required BOOLEAN NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cleaning_rate_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins and managers can read audit logs
CREATE POLICY "Admins and managers can read rate audit logs"
ON public.cleaning_rate_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Admins and managers can insert audit logs
CREATE POLICY "Admins and managers can insert rate audit logs"
ON public.cleaning_rate_audit_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create updated_at trigger for cleaning_rates
CREATE TRIGGER update_cleaning_rates_updated_at
  BEFORE UPDATE ON public.cleaning_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();