-- Rollback da migration 017
-- (supabase/migrations/20260713120000_bridge_tenants_clients.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- NÃO É MAIS SEGURO rodar isso isoladamente: a migration 016
-- (supabase/migrations/20260714120000_create_tenant_client_users.sql)
-- criou `tenant_users`, que também referencia `tenants` via FK. Reverter
-- este arquivo sem antes reverter a 016 deixa `tenant_users` órfã e
-- rows do tenant Otimizzo perdidos de vínculo. Ordem correta: rodar o
-- down da 016 primeiro (supabase/migrations_rollback/20260714120000_create_tenant_client_users_down.sql),
-- só depois este.

-- 1. Remove a FK antes de poder dropar a coluna
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_tenant_id_fkey;

-- 2. Remove a coluna (o índice idx_clients_tenant_id cai junto, é dependente dela)
ALTER TABLE public.clients DROP COLUMN IF EXISTS tenant_id;

-- 3. Remove o tenant Otimizzo criado na migration 017
DELETE FROM public.tenants WHERE is_platform_owner = true;
