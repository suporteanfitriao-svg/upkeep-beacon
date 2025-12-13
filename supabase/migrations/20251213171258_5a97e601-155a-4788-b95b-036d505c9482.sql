-- Create table for property checklist templates
CREATE TABLE public.property_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Checklist Padrão',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and managers can manage property checklists"
ON public.property_checklists
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Cleaners can read checklists for their assigned properties
CREATE POLICY "Cleaners can read assigned property checklists"
ON public.property_checklists
FOR SELECT
USING (
  has_role(auth.uid(), 'cleaner'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND (
      tm.has_all_properties = true OR
      EXISTS (
        SELECT 1 FROM public.team_member_properties tmp
        WHERE tmp.team_member_id = tm.id
        AND tmp.property_id = property_checklists.property_id
      )
    )
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_property_checklists_updated_at
BEFORE UPDATE ON public.property_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();