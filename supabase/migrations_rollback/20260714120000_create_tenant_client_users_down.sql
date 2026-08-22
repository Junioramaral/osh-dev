-- Rollback da migration 016
-- (supabase/migrations/20260714120000_create_tenant_client_users.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Seguro rodar a qualquer momento: nenhuma outra tabela referencia
-- `tenant_users` ou `client_users` ainda. Reverte na ordem inversa da
-- criação (client_users antes de tenant_users) por padrão, embora não
-- haja FK entre as duas.

DROP TABLE IF EXISTS public.client_users;
DROP TABLE IF EXISTS public.tenant_users;
