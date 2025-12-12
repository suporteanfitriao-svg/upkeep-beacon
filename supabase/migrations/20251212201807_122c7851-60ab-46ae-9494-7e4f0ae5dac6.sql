-- Add policy allowing users to view their own team_members record
CREATE POLICY "Users can view own team member record"
ON public.team_members
FOR SELECT
USING (user_id = auth.uid());