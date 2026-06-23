## Problema

Nos emails de notificação, o texto do comentário/resolução está sendo enviado em uma única linha contínua em clientes desktop (Outlook). Causa: o template usa `style="white-space:pre-wrap"` para preservar `\n`, mas o Outlook (motor Word) ignora essa CSS — então todas as quebras de linha do comentário viram espaço.

Adicionalmente, o conteúdo é interpolado cru no HTML (`${commentContent}`), o que pode quebrar o layout se o texto tiver `<`, `>` ou `&`, e representa um risco de injeção HTML.

## Solução

Em cada Edge Function que renderiza texto do usuário no email, fazer:

1. **Escapar HTML** (`&`, `<`, `>`, `"`, `'`) do conteúdo antes de injetar.
2. **Converter quebras de linha** (`\r\n`, `\n`) para `<br>` — funciona em todos os clientes, incluindo Outlook.
3. **Preservar parágrafos**: duas quebras seguidas viram separação de parágrafo.
4. **Enviar versão texto puro** (`text:` no payload do Resend) com o conteúdo original sem HTML, para clientes que preferem `text/plain` e melhor entregabilidade.

Implementar uma pequena função utilitária `formatUserText(raw: string)` que retorna `{ html, text }` e usá-la nos três arquivos.

## Arquivos afetados

- `supabase/functions/send-comment-notification/index.ts` — comentário do analista para o cliente.
- `supabase/functions/send-analyst-notification/index.ts` — comentário do cliente para o analista.
- `supabase/functions/send-resolution-notification/index.ts` — motivo da resolução.

Em cada um:
- Adicionar `escapeHtml` + `nl2br` (inline, ~10 linhas).
- Substituir `${commentContent}` / `${resolutionReason}` por `${escapeHtml(content).replace(/\r?\n/g, '<br>')}`.
- Remover `white-space:pre-wrap` (deixa de ser necessário).
- Adicionar `text:` ao payload `resend.emails.send` com o conteúdo cru.

Após as edições, fazer deploy das três funções.

## Fora de escopo

- Nenhuma mudança de schema, RLS, frontend ou template visual.
- Não mudar assunto, layout, cores ou cabeçalho dos emails.
- Não tocar nos templates de auth/Lovable.
