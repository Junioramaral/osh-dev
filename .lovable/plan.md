## Problema
O bucket `tickets` no Supabase Storage tem uma lista restrita de `allowed_mime_types` (jpeg, png, pdf, docx, etc). Arquivos como `.sql` chegam como `application/octet-stream` e são bloqueados pelo Storage — daí o erro `mime type application/octet-stream is not supported`. A validação foi removida no frontend, mas o bloqueio real acontece no backend.

## Correção
Criar uma migration que remove a restrição de MIME types do bucket `tickets`, permitindo qualquer tipo de arquivo (mantendo o limite de tamanho de 10MB e as RLS existentes de isolamento por tenant).

```sql
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'tickets';
```

## Escopo
- 1 arquivo novo: `supabase/migrations/<timestamp>_allow_any_mime_tickets_bucket.sql`
- Nenhuma alteração de RLS, tamanho, ou código frontend.