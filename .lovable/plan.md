Ocultar o switch "Comentário interno" na visão do cliente em `src/components/tickets/TicketComments.tsx`, envolvendo o bloco do Switch/Label/Tooltip em `{!isClientUser && ...}`. Como `isInternal` já inicia como `false`, todo comentário do cliente será externo e o analista responsável será notificado automaticamente (lógica já existente).

Arquivo: `src/components/tickets/TicketComments.tsx`