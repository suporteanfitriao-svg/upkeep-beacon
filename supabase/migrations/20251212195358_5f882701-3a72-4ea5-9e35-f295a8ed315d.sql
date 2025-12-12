
-- Add has_all_properties column to team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS has_all_properties boolean NOT NULL DEFAULT true;

-- Create team_member_properties junction table
CREATE TABLE public.team_member_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_member_id, property_id)
);

-- Enable RLS
ALTER TABLE public.team_member_properties ENABLE ROW LEVEL SECURITY;

-- Only admins can manage property access
CREATE POLICY "Admins can manage team member properties"
ON public.team_member_properties
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
