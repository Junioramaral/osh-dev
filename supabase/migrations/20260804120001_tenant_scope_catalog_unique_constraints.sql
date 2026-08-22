-- Migration 026 do plano de refatoração multi-tenant.
-- Complemento da 025 (20260804120000): faltaram 4 constraints UNIQUE globais
-- que quebram na hora de semear o starter kit de um tenant novo, porque o
-- seed copia registros com o MESMO nome/código pra dois tenants diferentes
-- (ex: os dois teriam uma categoria "Erro SQL"/segment DB, um segmento
-- "DB", um engine "PostgreSQL", um feriado "2026-02-16"). Sem esta correção,
-- o passo 3b de supabase/functions/create-tenant/index.ts falha ao tentar
-- inserir a segunda cópia.
--
-- Não corrige ticket_subcategories_category_id_name_key (category_id, name)
-- — já é efetivamente isolado por tenant, pois cada tenant tem seus próprios
-- category_id (UUIDs distintos), então essa constraint já nunca colide entre
-- tenants.
--
-- Rollback: supabase/migrations_rollback/20260804120001_tenant_scope_catalog_unique_constraints_down.sql

ALTER TABLE public.application_products DROP CONSTRAINT application_products_name_key;
ALTER TABLE public.application_products ADD CONSTRAINT application_products_tenant_name_key UNIQUE (tenant_id, name);

ALTER TABLE public.ticket_categories DROP CONSTRAINT ticket_categories_name_segment_key;
ALTER TABLE public.ticket_categories ADD CONSTRAINT ticket_categories_tenant_name_segment_key UNIQUE (tenant_id, name, segment);

ALTER TABLE public.segments DROP CONSTRAINT segments_code_key;
ALTER TABLE public.segments ADD CONSTRAINT segments_tenant_code_key UNIQUE (tenant_id, code);

ALTER TABLE public.database_engines DROP CONSTRAINT database_engines_name_key;
ALTER TABLE public.database_engines ADD CONSTRAINT database_engines_tenant_name_key UNIQUE (tenant_id, name);

ALTER TABLE public.sla_holidays DROP CONSTRAINT sla_holidays_holiday_date_key;
ALTER TABLE public.sla_holidays ADD CONSTRAINT sla_holidays_tenant_holiday_date_key UNIQUE (tenant_id, holiday_date);
