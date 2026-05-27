## Endurecer política SELECT do bucket `faq-attachments`

Auditoria dos três buckets concluída. `tickets` e `avatars` estão corretos (avatars público é intencional, já no security memory). O único problema é o bucket privado `faq-attachments`: a política de SELECT atual permite que qualquer usuário autenticado baixe qualquer anexo, incluindo rascunhos e artigos `client_specific` de outros tenants — basta conhecer o path.

### Migration única (sem mudanças de frontend)

1. **DROP** policy `Authenticated users view faq attachments`.
2. **CREATE** nova policy `View faq attachments by article visibility` (SELECT, role `authenticated`) com regra:
   - super_admin ou otimizzo → tudo.
   - Demais (incluindo viewers) → apenas quando existe `faq_articles fa` com `fa.id::text = (storage.foldername(name))[1]`, `fa.status = 'publicado'` e visibilidade `global` ou `client_specific` do tenant do usuário.
3. **ALTER** policies de otimizzo (upload/update/delete em faq-attachments) trocando `roles` de `{public}` para `{authenticated}` (mantém o predicado).

### Antes de escrever

- Conferir paths legados com `SELECT name FROM storage.objects WHERE bucket_id='faq-attachments' LIMIT 10`. Se o primeiro segmento não for sempre um UUID de artigo, ampliar a cláusula para também casar via `EXISTS (SELECT 1 FROM faq_articles WHERE attachments @> ...)` antes de aplicar.

### Pós-migration

- Rodar `supabase--linter` e listar políticas de `storage.objects` para confirmar resultado.
- Atualizar `@security-memory`: registrar nova regra (SELECT em faq-attachments segue visibilidade de `faq_articles`; rascunhos restritos a otimizzo/super_admin).

### Fora do escopo

- `tickets` (já endurecido).
- `avatars` público (intencional, risco aceito).
- Migração para signed URLs em faq-attachments (segue como risco aceito).
- Qualquer mudança em código TS/TSX — a API `supabase.storage.from('faq-attachments').download(path)` continua a mesma.
