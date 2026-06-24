## Aplicar nome completo do ambiente na sidebar do ticket

### Problema
Em `TicketSidebar.tsx` (linha 664), o campo "Ambiente" exibe o valor cru do enum (`prod`, `hom`, `qa`, `dev`), igual ao problema já corrigido em `TicketDetails.tsx`.

### Solução
1. Exportar `formatEnvironment` de `src/components/tickets/TicketDetails.tsx`.
2. Importar `formatEnvironment` em `src/components/tickets/TicketSidebar.tsx`.
3. Aplicá-lo no `InfoRow` de "Ambiente" (linha 664), convertendo `ticket.db_environment || ticket.app_environment` para o nome legível.

### Arquivos
- `src/components/tickets/TicketDetails.tsx` — adicionar `export` na função `formatEnvironment`.
- `src/components/tickets/TicketSidebar.tsx` — importar e usar `formatEnvironment`.

Nenhuma alteração de schema necessária — apenas exibição.