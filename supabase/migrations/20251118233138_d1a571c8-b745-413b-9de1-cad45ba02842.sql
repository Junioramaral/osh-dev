-- Add new columns to machines table for complete machine management
ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS environment text,
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS root_username text,
ADD COLUMN IF NOT EXISTS root_password_secret_id uuid,
ADD COLUMN IF NOT EXISTS additional_users jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS description text;

-- Add comment explaining the additional_users structure
COMMENT ON COLUMN machines.additional_users IS 'Array of objects: [{"username": "user1", "password_secret_id": "uuid", "description": "User description"}]';

-- Update existing rows to have default environment if null
UPDATE machines SET environment = 'prod' WHERE environment IS NULL;