-- Adicionar política para Otimizzo users visualizarem todas as roles
CREATE POLICY "Otimizzo users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()));