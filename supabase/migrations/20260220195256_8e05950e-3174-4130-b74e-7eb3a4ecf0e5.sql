
-- Migração 1: Adicionar 'aguardando_aprovacao' ao enum ticket_status
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'aguardando_aprovacao';

-- Migração 2: Adicionar coluna record_type na tabela tickets
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS record_type text NOT NULL DEFAULT 'suporte';

-- Migração 3: Criar tabela rfc_steps
CREATE TABLE IF NOT EXISTS public.rfc_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  status_concluido boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela rfc_steps
ALTER TABLE public.rfc_steps ENABLE ROW LEVEL SECURITY;

-- Otimizzo pode gerenciar todos os passos
CREATE POLICY "Otimizzo manage rfc_steps" ON public.rfc_steps
FOR ALL USING (is_otimizzo_user(auth.uid()))
WITH CHECK (is_otimizzo_user(auth.uid()));

-- Super admins gerenciam tudo
CREATE POLICY "Super admins manage rfc_steps" ON public.rfc_steps
FOR ALL USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Clientes visualizam os passos dos seus tickets
CREATE POLICY "Client view own rfc_steps" ON public.rfc_steps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = rfc_steps.ticket_id 
    AND t.client_id = get_user_tenant_id(auth.uid())
  )
);

-- Trigger para atualizar updated_at em rfc_steps
CREATE TRIGGER update_rfc_steps_updated_at
BEFORE UPDATE ON public.rfc_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
