-- Allow users to update their own team member record (for profile editing)
CREATE POLICY "Users can update own team member record"
ON public.team_members
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());