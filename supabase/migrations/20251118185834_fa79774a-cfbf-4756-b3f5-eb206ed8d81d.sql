-- Add database engines and application product IDs to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS db_engines text[] DEFAULT ARRAY[]::text[];

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS app_product_ids uuid[] DEFAULT ARRAY[]::uuid[];

-- Add comments for documentation
COMMENT ON COLUMN clients.db_engines IS 'Array de engines de banco de dados contratados (PostgreSQL, MySQL, SQL Server, Oracle, MongoDB)';
COMMENT ON COLUMN clients.app_product_ids IS 'Array de IDs dos produtos de aplicação contratados';