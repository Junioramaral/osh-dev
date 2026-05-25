
-- 1. faq_history: restrict INSERT to authenticated
DROP POLICY IF EXISTS "System can insert faq history" ON public.faq_history;
CREATE POLICY "Authenticated can insert faq history"
ON public.faq_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. report_send_logs: restrict INSERT to authenticated
DROP POLICY IF EXISTS "System can insert report logs" ON public.report_send_logs;
CREATE POLICY "Authenticated can insert report logs"
ON public.report_send_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. ticket_history: restrict INSERT and SELECT to authenticated
DROP POLICY IF EXISTS "System can insert ticket history" ON public.ticket_history;
CREATE POLICY "Authenticated can insert ticket history"
ON public.ticket_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view ticket history for accessible tickets" ON public.ticket_history;
CREATE POLICY "Authenticated can view ticket history for accessible tickets"
ON public.ticket_history
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_history.ticket_id));

-- 4. ticket_sla_pauses: restrict INSERT and SELECT to authenticated
DROP POLICY IF EXISTS "System insert sla pauses" ON public.ticket_sla_pauses;
CREATE POLICY "Authenticated insert sla pauses"
ON public.ticket_sla_pauses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "View sla pauses via ticket" ON public.ticket_sla_pauses;
CREATE POLICY "Authenticated view sla pauses via ticket"
ON public.ticket_sla_pauses
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_sla_pauses.ticket_id));

-- 5. ticket_comments: tighten INSERT to tenant match (or Otimizzo/super_admin)
DROP POLICY IF EXISTS "Insert comments" ON public.ticket_comments;
CREATE POLICY "Insert comments scoped to tenant"
ON public.ticket_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_comments.ticket_id
      AND (
        public.is_super_admin(auth.uid())
        OR public.is_otimizzo_user(auth.uid())
        OR t.client_id = public.get_user_tenant_id(auth.uid())
      )
  )
);

-- 6. sla_notifications: remove viewer access to sensitive email content/recipients
DROP POLICY IF EXISTS "Viewers can view tenant sla notifications" ON public.sla_notifications;

-- 7. Storage: add admin DELETE/UPDATE policies for the private "tickets" bucket
DROP POLICY IF EXISTS "Admins delete ticket files" ON storage.objects;
CREATE POLICY "Admins delete ticket files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tickets'
  AND (public.is_super_admin(auth.uid()) OR public.is_otimizzo_user(auth.uid()))
);

DROP POLICY IF EXISTS "Admins update ticket files" ON storage.objects;
CREATE POLICY "Admins update ticket files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tickets'
  AND (public.is_super_admin(auth.uid()) OR public.is_otimizzo_user(auth.uid()))
)
WITH CHECK (
  bucket_id = 'tickets'
  AND (public.is_super_admin(auth.uid()) OR public.is_otimizzo_user(auth.uid()))
);
