-- Allow super_admins to manage teams (INSERT, UPDATE, DELETE)
CREATE POLICY "Super admins manage teams" ON public.teams
FOR ALL USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));