
CREATE TABLE public.ticket_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  linked_ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  linked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_links_no_self CHECK (ticket_id <> linked_ticket_id),
  CONSTRAINT ticket_links_unique UNIQUE (ticket_id, linked_ticket_id)
);

CREATE INDEX idx_ticket_links_ticket_id ON public.ticket_links(ticket_id);
CREATE INDEX idx_ticket_links_linked_ticket_id ON public.ticket_links(linked_ticket_id);

GRANT SELECT, INSERT, DELETE ON public.ticket_links TO authenticated;
GRANT ALL ON public.ticket_links TO service_role;

ALTER TABLE public.ticket_links ENABLE ROW LEVEL SECURITY;

-- SELECT: internos sempre; clientes apenas se ticket pertence ao seu tenant
CREATE POLICY "ticket_links_select"
ON public.ticket_links
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.is_otimizzo_user(auth.uid())
  OR public.is_analyst(auth.uid())
  OR public.is_viewer(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_links.ticket_id
      AND t.client_id = public.get_user_tenant_id(auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_links.linked_ticket_id
      AND t.client_id = public.get_user_tenant_id(auth.uid())
  )
);

-- INSERT: apenas usuários internos
CREATE POLICY "ticket_links_insert"
ON public.ticket_links
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.is_otimizzo_user(auth.uid())
  OR public.is_analyst(auth.uid())
);

-- DELETE: apenas usuários internos
CREATE POLICY "ticket_links_delete"
ON public.ticket_links
FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.is_otimizzo_user(auth.uid())
  OR public.is_analyst(auth.uid())
);
