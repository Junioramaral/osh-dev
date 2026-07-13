-- Migration 017 do plano de refatoração multi-tenant.
-- Ponte entre `tenants` (criada na 015) e `clients` (existente): cria o
-- tenant Otimizzo e associa toda linha de `clients` a ele via tenant_id.
--
-- Não cria nenhuma policy de RLS (escopo da 018) e não toca em nenhuma
-- outra tabela (user_roles, tickets, etc.) além de `tenants`/`clients`.
--
-- `tenant_type` em `clients` permanece intocada — sem uso funcional novo
-- até uma migration futura decidir o que fazer com ela.
--
-- Rollback: supabase/migrations_rollback/20260713120000_bridge_tenants_clients_down.sql

-- 1. Tenant Otimizzo
INSERT INTO public.tenants (name, slug, is_platform_owner, is_active)
VALUES ('Otimizzo', 'otimizzo', true, true);

-- 2. Coluna nova, ainda sem NOT NULL/FK (tabela já tem linhas)
ALTER TABLE public.clients ADD COLUMN tenant_id uuid;

-- 3. Backfill: toda linha de clients aponta pro tenant Otimizzo,
-- inclusive a que tem tenant_type = 'otimizzo'. Sem filtro por tenant_type.
UPDATE public.clients
SET tenant_id = (SELECT id FROM public.tenants WHERE is_platform_owner = true);

-- 4. Só agora, com backfill completo, exigir o valor
ALTER TABLE public.clients ALTER COLUMN tenant_id SET NOT NULL;

-- 5. FK com RESTRICT de propósito: apagar um tenant não pode apagar
-- silenciosamente todos os clients dele
ALTER TABLE public.clients
  ADD CONSTRAINT clients_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

-- 6. Índice: toda policy RLS futura vai filtrar por tenant_id
CREATE INDEX idx_clients_tenant_id ON public.clients(tenant_id);
