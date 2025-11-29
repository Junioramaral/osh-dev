-- Add foreign key constraint between profiles.team_id and teams.id
-- This allows proper JOIN queries with teams table
ALTER TABLE profiles
ADD CONSTRAINT profiles_team_id_fkey
FOREIGN KEY (team_id)
REFERENCES teams(id)
ON DELETE SET NULL;