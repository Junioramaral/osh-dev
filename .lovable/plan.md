## Renomear "Comentários" → "Notas" na aba do ticket

### Escopo
Apenas a UI da aba de comentários do ticket. Emails, RFC, CSAT e relatórios permanecem com "Comentário(s)".

### Alterações

**`src/pages/TicketDetail.tsx`** (linha 97)
- Título da aba: `Comentários (n)` → `Notas (n)`

**`src/components/tickets/TicketComments.tsx`**
- Estados vazios/loading:
  - "Carregando comentários..." → "Carregando notas..."
  - "Nenhum comentário ainda" → "Nenhuma nota ainda"
- Placeholder do textarea: "Adicionar comentário..." → "Adicionar nota..."
- Label do checkbox: "Comentário interno" → "Nota interna"
- Mensagens de ajuda do checkbox:
  - "🔒 O cliente NÃO receberá este comentário" → "🔒 O cliente NÃO receberá esta nota"
  - "📧 O cliente receberá este comentário por email" → "📧 O cliente receberá esta nota por email"
- Toasts:
  - "Comentário enviado" → "Nota enviada"
  - "Comentário enviado e cliente notificado por email" → "Nota enviada e cliente notificado por email"
  - "Comentário interno adicionado com sucesso" → "Nota interna adicionada com sucesso"
  - "Erro ao adicionar comentário" → "Erro ao adicionar nota"
  - "Comentário muito longo" + descrição "O comentário deve ter no máximo 10.000 caracteres" → "Nota muito longa" / "A nota deve ter no máximo 10.000 caracteres"
- Mensagem do viewer: "Você não pode adicionar comentários" → "Você não pode adicionar notas"

### Fora do escopo (mantém "Comentário")
- Emails (`send-comment-notification`, `send-rfc-decision-notification`)
- RFC approval (`RFCApproval.tsx`)
- CSAT (`CSATSatisfactionReport.tsx`, `CSATDashboard.tsx`)
- Relatórios de tenant (`TenantUserReport.tsx`)
- Textos de outras telas (Index, Reports, DeleteTicketDialog, TicketTimeline, TicketAttachments, hooks de bulk, etc.)
- Nomes de variáveis, tabelas e logs no código (apenas strings de UI são alteradas)