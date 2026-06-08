## Objetivo

Permitir que o cliente (e também analistas) adicione anexos a um ticket existente — tanto na aba **Anexos** quanto junto a um **comentário**, com link clicável que leva ao anexo.

## Análise: qual a melhor abordagem?

Recomendo **fazer as duas coisas, com o comentário como caminho principal**:

1. **Anexos no comentário (primário)** — é o fluxo natural quando o cliente está respondendo ("segue o print do erro"). Mantém contexto: o anexo fica vinculado à mensagem que o explica, e o analista é notificado por email com o link.
2. **Upload direto na aba Anexos (secundário)** — útil quando o cliente só quer adicionar um documento sem precisar comentar (ex.: contrato, planilha de apoio). Cria internamente um comentário "📎 Anexo adicionado" para manter rastreabilidade na timeline.

Assim cobrimos os dois cenários sem duplicar infra de upload.

## Mudanças

### 1. `TicketComments.tsx` — anexos no comentário
- Reutilizar `FileUploadZone` (já usado em `NewTicketDialog`) abaixo do textarea, recolhido por padrão atrás de um botão "📎 Anexar arquivos" (ícone Paperclip já importado).
- No `addCommentMutation`:
  - Após inserir o comentário, fazer upload de cada arquivo para o bucket `tickets/` no path `{tenant_id}/{ticket_id}/comments/{comment_id}/{timestamp}_{safeName}` (mesma sanitização de nome já aplicada no `NewTicketDialog`).
  - Atualizar `ticket_comments.attachments` (jsonb) com `[{ name, path, size, type }]`.
- Renderizar anexos dentro do `CommentCard`:
  - Lista de "pílulas" clicáveis com ícone + nome + tamanho.
  - Ao clicar, gerar `createSignedUrl` (1h) e abrir em nova aba / iniciar download — mesmo padrão de `TicketAttachments.tsx`.
- Passar os anexos do comentário para `send-comment-notification` / `send-analyst-notification` para que o email inclua a lista (texto + link assinado de validade maior, ex. 7 dias) — incremento opcional, posso fazer em segundo passo se preferir.

### 2. `TicketAttachments.tsx` — upload direto na aba
- Adicionar um cartão/zona de upload no topo (acima do grid), oculto para `isViewer` e quando o ticket estiver `resolvido`/`fechado`.
- Ao soltar/enviar arquivos:
  - Criar um `ticket_comment` automático com `content = "📎 Anexos adicionados via aba Anexos"`, `is_internal = false` (cliente) / configurável (analista).
  - Subir arquivos no mesmo path-padrão e gravar em `attachments` do comentário criado.
  - Invalidar queries `ticket-comments` e `ticket-detail` para os anexos aparecerem imediatamente no grid (que já agrega `comments.attachments`).
- Não criamos coluna nova em `tickets.evidences` — manter `evidences` apenas para o ticket original.

### 3. Permissões / RLS
- O bucket `tickets` é privado. As policies já permitem upload pelo tenant dono (via `validate_ticket_upload_path`) e `is_otimizzo_user`. Vou conferir as policies de `storage.objects` para o bucket `tickets` antes de implementar; se necessário, abro uma migração só para garantir INSERT do cliente dentro do path `{client_tenant_id}/{ticket_id}/...`.
- `ticket_comments.attachments` já é jsonb — sem migração de schema.

### 4. UX
- Limites: 10 arquivos / 20MB por arquivo (mesmo do `NewTicketDialog`).
- Imagens passam pela compressão existente do `FileUploadZone`.
- Indicador visual no `CommentCard` mostrando contagem ("📎 2 anexos") + lista expandida.
- Spinner durante upload; toast de erro detalhado se algum arquivo falhar (não bloqueia o comentário).

## Fora de escopo (posso fazer depois se quiser)
- Anexar imagens inline dentro do texto do comentário (rich text).
- Preview embutido de PDFs/imagens grandes.
- Versionamento / substituição de anexos.

## Confirmações antes de implementar
1. OK com a abordagem dupla (comentário + upload direto na aba)?
2. Quando o cliente sobe anexo direto pela aba, criar comentário automático visível para a equipe (sugerido) ou silencioso sem notificação?
3. Anexos devem ser incluídos como link nos emails de notificação ao analista/cliente?
