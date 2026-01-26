-- Migração 1: Apenas adicionar viewer ao enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';