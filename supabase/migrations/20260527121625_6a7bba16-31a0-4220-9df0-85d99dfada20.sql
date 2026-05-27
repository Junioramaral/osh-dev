-- Endurecer SELECT em faq-attachments para seguir a visibilidade de faq_articles
DROP POLICY IF EXISTS "Authenticated users view faq attachments" ON storage.objects;

CREATE POLICY "View faq attachments by article visibility"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'faq-attachments'
  AND (
    is_super_admin(auth.uid())
    OR is_otimizzo_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.faq_articles fa
      WHERE fa.id::text = (storage.foldername(name))[1]
        AND fa.status = 'publicado'
        AND (
          fa.visibility = 'global'
          OR (fa.visibility = 'client_specific'
              AND fa.client_id = get_user_tenant_id(auth.uid()))
        )
    )
  )
);

-- Padronizar roles (public -> authenticated) sem alterar predicados
DROP POLICY IF EXISTS "Otimizzo upload faq attachments" ON storage.objects;
CREATE POLICY "Otimizzo upload faq attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'faq-attachments'
  AND (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()))
);

DROP POLICY IF EXISTS "Otimizzo update faq attachments" ON storage.objects;
CREATE POLICY "Otimizzo update faq attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'faq-attachments'
  AND (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()))
);

DROP POLICY IF EXISTS "Otimizzo delete faq attachments" ON storage.objects;
CREATE POLICY "Otimizzo delete faq attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'faq-attachments'
  AND (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()))
);