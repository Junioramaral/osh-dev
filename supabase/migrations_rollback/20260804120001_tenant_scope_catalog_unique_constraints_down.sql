-- Rollback de 20260804120001_tenant_scope_catalog_unique_constraints.sql
-- Restaura as constraints UNIQUE globais originais.

ALTER TABLE public.application_products DROP CONSTRAINT application_products_tenant_name_key;
ALTER TABLE public.application_products ADD CONSTRAINT application_products_name_key UNIQUE (name);

ALTER TABLE public.ticket_categories DROP CONSTRAINT ticket_categories_tenant_name_segment_key;
ALTER TABLE public.ticket_categories ADD CONSTRAINT ticket_categories_name_segment_key UNIQUE (name, segment);

ALTER TABLE public.segments DROP CONSTRAINT segments_tenant_code_key;
ALTER TABLE public.segments ADD CONSTRAINT segments_code_key UNIQUE (code);

ALTER TABLE public.database_engines DROP CONSTRAINT database_engines_tenant_name_key;
ALTER TABLE public.database_engines ADD CONSTRAINT database_engines_name_key UNIQUE (name);

ALTER TABLE public.sla_holidays DROP CONSTRAINT sla_holidays_tenant_holiday_date_key;
ALTER TABLE public.sla_holidays ADD CONSTRAINT sla_holidays_holiday_date_key UNIQUE (holiday_date);
