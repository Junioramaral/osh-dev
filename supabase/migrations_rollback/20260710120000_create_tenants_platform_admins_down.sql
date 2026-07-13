-- Rollback da migration 015
-- (supabase/migrations/20260710120000_create_tenants_platform_admins.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Seguro rodar a qualquer momento: nenhuma outra tabela referencia
-- `tenants` ou `platform_admins` ainda (essas FKs entram em migrations
-- futuras do plano multi-tenant), então não há dependência a desfazer antes.

DROP TABLE IF EXISTS public.platform_admins;
DROP TABLE IF EXISTS public.tenants;
