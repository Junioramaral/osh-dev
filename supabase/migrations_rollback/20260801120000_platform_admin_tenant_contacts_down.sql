-- Rollback da migration 023
-- (supabase/migrations/20260801120000_platform_admin_tenant_contacts.sql)
--
-- NÃO mover para supabase/migrations/ — mesmo motivo de sempre: o CLI
-- rodaria isso automaticamente no próximo db push/db reset.

DROP FUNCTION IF EXISTS public.platform_admin_list_tenant_contacts(uuid);
