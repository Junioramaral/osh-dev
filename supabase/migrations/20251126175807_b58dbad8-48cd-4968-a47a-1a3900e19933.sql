-- Expand app_role enum to include granular roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'tenant_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'analyst_db';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'analyst_app';