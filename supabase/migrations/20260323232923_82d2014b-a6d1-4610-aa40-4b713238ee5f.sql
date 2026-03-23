-- DELETE policies for tenant_admin on tickets
CREATE POLICY "Tenant admins can delete own tickets"
ON public.tickets FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin') 
  AND client_id = get_user_tenant_id(auth.uid())
);

-- ticket_comments: allow delete for super_admin and tenant_admin
CREATE POLICY "Admins can delete ticket comments"
ON public.ticket_comments FOR DELETE TO authenticated
USING (
  is_super_admin(auth.uid()) 
  OR (has_role(auth.uid(), 'tenant_admin') AND EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_comments.ticket_id AND t.client_id = get_user_tenant_id(auth.uid())
  ))
);

-- ticket_history: allow delete for super_admin and tenant_admin
CREATE POLICY "Admins can delete ticket history"
ON public.ticket_history FOR DELETE TO authenticated
USING (
  is_super_admin(auth.uid()) 
  OR (has_role(auth.uid(), 'tenant_admin') AND EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_history.ticket_id AND t.client_id = get_user_tenant_id(auth.uid())
  ))
);

-- ticket_time_logs: allow delete for super_admin and tenant_admin
CREATE POLICY "Admins can delete ticket time logs"
ON public.ticket_time_logs FOR DELETE TO authenticated
USING (
  is_super_admin(auth.uid()) 
  OR (has_role(auth.uid(), 'tenant_admin') AND EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_time_logs.ticket_id AND t.client_id = get_user_tenant_id(auth.uid())
  ))
);

-- rfc_steps: allow delete for tenant_admin (super_admin already has ALL)
CREATE POLICY "Tenant admins can delete own rfc steps"
ON public.rfc_steps FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin') AND EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = rfc_steps.ticket_id AND t.client_id = get_user_tenant_id(auth.uid())
  )
);

-- sla_notifications: allow delete for super_admin and tenant_admin
CREATE POLICY "Admins can delete sla notifications"
ON public.sla_notifications FOR DELETE TO authenticated
USING (
  is_super_admin(auth.uid()) 
  OR (has_role(auth.uid(), 'tenant_admin') AND EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = sla_notifications.ticket_id AND t.client_id = get_user_tenant_id(auth.uid())
  ))
);