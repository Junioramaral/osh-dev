-- Remove foreign key existente que aponta para auth.users
ALTER TABLE user_roles
DROP CONSTRAINT user_roles_user_id_fkey;

-- Adiciona nova foreign key apontando para profiles
ALTER TABLE user_roles
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Cria índice para melhorar performance do JOIN
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
ON user_roles(user_id);