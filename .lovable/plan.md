## Mudanças na aba "Comentários" do ticket

### 1. Comentários colapsados por padrão
- Cada `CommentCard` em `src/components/tickets/TicketComments.tsx` passa a ser um `Collapsible`.
- Estado fechado mostra apenas o cabeçalho (avatar, nome, data/hora, badge de tipo e — quando aplicável — destinatários). Um chevron à direita indica que pode abrir.
- Clicar em qualquer lugar do cabeçalho expande/recolhe, revelando `content` + `attachments`.
- Uma prévia curta (primeira linha truncada) aparece no cabeçalho quando colapsado, para dar contexto sem abrir.

### 2. Ordenação: mais novo no topo
- Em `src/hooks/useTicketDetail.ts` → `useTicketComments`, trocar `order('created_at', { ascending: true })` por `ascending: false`.
- Verificar dependências: `TicketDetail.tsx` usa apenas `comments.length` (contador), e `TicketTimeline.tsx` reordena os eventos depois, então a inversão é segura.

### 3. Mostrar destinatários abaixo do badge "Enviado ao cliente"
Hoje os emails CC enviados não são persistidos — só passam pela edge function. Para exibi-los:

- **Migration**: adicionar coluna `recipients jsonb` em `public.ticket_comments` (array de strings com TO + CC). Sem alterações de RLS/grants — herda as policies existentes.
- **Persistência**: na mutation `addCommentMutation` de `TicketComments.tsx`, quando o comentário for externo (não interno) e enviado por staff, gravar `recipients: [contact_email, ...ccEmails]` no insert.
- **Exibição**: no `CommentCard`, logo abaixo do badge "Enviado ao cliente" (e também "Resposta do cliente" se houver `recipients`), renderizar lista compacta dos emails — ex.: `Para: fulano@x.com, beltrano@y.com`. Aparece tanto no estado colapsado quanto expandido para o usuário saber para quem foi.
- Comentários antigos (sem `recipients`) caem em fallback: mostra apenas `ticket.contact_email` quando o badge for "Enviado ao cliente".

### Arquivos afetados
- `src/components/tickets/TicketComments.tsx` (colapsar, exibir recipients, gravar recipients no insert)
- `src/hooks/useTicketDetail.ts` (ordem desc)
- Nova migration: `ALTER TABLE public.ticket_comments ADD COLUMN recipients jsonb;`

### Fora de escopo
- Não altero lógica de envio de email/edge functions, apenas adiciono o registro local dos destinatários.
- Não mexo em outras abas (Timeline, Detalhes).