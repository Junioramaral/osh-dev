## Remover coluna "Atualizado" da listagem de tickets no email

As colunas estão se sobrepondo (Número/Título, Segmento/Prioridade/Status). Vou remover a coluna `Atualizado` e redistribuir as larguras com folga para evitar sobreposição.

### Mudanças em `supabase/functions/send-monthly-report/index.ts`

1. **Remover** `<th>Atualizado</th>`, o `<td>` correspondente com `formatBRStacked(t.updated_at)`, e o `<col>` da coluna.
2. **Redistribuir larguras** para 7 colunas:
   - Número 10% | Título 32% | Segmento 10% | Prioridade 11% | Status 14% | SLA 7% | Abertura 16%
3. **Manter** `formatBRStacked` apenas para `Abertura` (data em cima, hora em cinza embaixo).
4. **Não remover** a função `formatBRStacked` (segue em uso para Abertura).
5. Selecionar `updated_at` no SELECT pode ficar (inofensivo) ou ser removido — vou manter para não tocar a query.

### Arquivo alterado
- `supabase/functions/send-monthly-report/index.ts`
