-- Rollback da migration 017
-- (supabase/migrations/20260713120000_bridge_tenants_clients.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Seguro rodar SOMENTE enquanto nenhuma outra tabela referenciar `tenants`
-- além de `clients` (via clients_tenant_id_fkey, removida no passo 1
-- abaixo). A migration 016 do plano vai introduzir outras referências
-- (ex: tenant_users) — depois disso, este rollback deixa de ser seguro
-- como está e precisa ser revisado.

-- 1. Remove a FK antes de poder dropar a coluna
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_tenant_id_fkey;

-- 2. Remove a coluna (o índice idx_clients_tenant_id cai junto, é dependente dela)
ALTER TABLE public.clients DROP COLUMN IF EXISTS tenant_id;

-- 3. Remove o tenant Otimizzo criado na migration 017
DELETE FROM public.tenants WHERE is_platform_owner = true;
