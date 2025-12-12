-- Create storage bucket for FAQ attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('faq-attachments', 'faq-attachments', false);

-- RLS policies for the bucket
CREATE POLICY "Otimizzo upload faq attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'faq-attachments' AND
  (public.is_otimizzo_user(auth.uid()) OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "Authenticated users view faq attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'faq-attachments' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Otimizzo delete faq attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'faq-attachments' AND
  (public.is_otimizzo_user(auth.uid()) OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "Otimizzo update faq attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'faq-attachments' AND
  (public.is_otimizzo_user(auth.uid()) OR public.is_super_admin(auth.uid()))
);

-- RPC function to increment view count
CREATE OR REPLACE FUNCTION public.increment_faq_view_count(article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE faq_articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = article_id;
END;
$$;