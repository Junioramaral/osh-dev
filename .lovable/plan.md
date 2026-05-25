## Aplicar filtro de múltiplos status em "Meus Tickets"

Replicar o filtro de status multi-seleção (popover com checkboxes) já existente em `src/pages/Tickets.tsx` para `src/pages/MyTickets.tsx`, substituindo o atual `Select` de status único.

### Alterações em `src/pages/MyTickets.tsx`

1. Imports: adicionar `Popover, PopoverContent, PopoverTrigger`, `Button`, `Checkbox` (já presente), `ChevronDown` do lucide-react.
2. Substituir estado:
   - Remover `statusFilter: string` com valor `"all"`.
   - Adicionar `STATUS_OPTIONS` e `DEFAULT_STATUS_FILTERS` idênticos a Tickets.tsx (mesmos 9 status e mesmos 7 default ativos).
   - Adicionar `statusFilters: string[]` inicializado com `DEFAULT_STATUS_FILTERS`.
3. Atualizar filtro:
   - Trocar `matchesStatus = statusFilter === "all" || ticket.status === statusFilter` por `matchesStatus = statusFilters.length === 0 ? false : statusFilters.includes(ticket.status)`.
4. UI: substituir o `<Select>` de status pelo `<Popover>` com mesma estrutura visual de Tickets.tsx (botão com contagem, opções "Selecionar todos" / "Limpar", lista de checkboxes).
5. Empty state: ajustar verificação para usar `statusFilters` em vez de `statusFilter !== "all"`.

### Fora do escopo

- Nenhuma alteração em `Tickets.tsx`, hooks, ou lógica de backend.
- Sem mudanças nos demais filtros (segmento, time, tipo).