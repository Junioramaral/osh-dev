-- Create visibility enum for FAQ articles
CREATE TYPE faq_visibility AS ENUM ('private', 'client_specific', 'global');

-- Add visibility and client_id columns to faq_articles
ALTER TABLE faq_articles 
ADD COLUMN visibility faq_visibility DEFAULT 'private',
ADD COLUMN client_id uuid REFERENCES clients(id);

-- Create index for better query performance
CREATE INDEX idx_faq_articles_visibility ON faq_articles(visibility);
CREATE INDEX idx_faq_articles_client_id ON faq_articles(client_id);

-- Drop existing RLS policies for faq_articles
DROP POLICY IF EXISTS "All view published faq" ON faq_articles;
DROP POLICY IF EXISTS "Otimizzo create faq" ON faq_articles;
DROP POLICY IF EXISTS "Otimizzo update faq" ON faq_articles;
DROP POLICY IF EXISTS "Super admins manage faq" ON faq_articles;

-- New RLS policies based on visibility levels

-- Super admins can manage all articles
CREATE POLICY "Super admins manage faq" ON faq_articles
FOR ALL USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Otimizzo users can create/update/delete articles
CREATE POLICY "Otimizzo manage faq" ON faq_articles
FOR ALL USING (is_otimizzo_user(auth.uid()))
WITH CHECK (is_otimizzo_user(auth.uid()));

-- View policy: Private articles only for Otimizzo/super_admin
-- Client-specific articles for Otimizzo/super_admin OR matching tenant
-- Global published articles for everyone
CREATE POLICY "View faq based on visibility" ON faq_articles
FOR SELECT USING (
  -- Super admins and Otimizzo users can see everything
  is_super_admin(auth.uid()) OR is_otimizzo_user(auth.uid())
  OR (
    -- Published global articles visible to all
    visibility = 'global' AND status = 'publicado'
  )
  OR (
    -- Published client-specific articles visible to matching tenant
    visibility = 'client_specific' 
    AND status = 'publicado' 
    AND client_id = get_user_tenant_id(auth.uid())
  )
);