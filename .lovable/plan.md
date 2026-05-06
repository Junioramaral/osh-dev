## Objetivo

Trocar o filtro de Status (atualmente um Select de seleção única) por um **multi-select com checkboxes**, permitindo escolher múltiplos status simultaneamente. O default deve marcar todos EXCETO "Resolvido" e "Fechado".

## Comportamento

- Botão/trigger no lugar do Select atual mostrando "Status (N)" ou os labels selecionados resumidos.
- Ao abrir, exibe checkboxes para: Rascunho, Novo, Em Atendimento, Aguardando Cliente, Resolvido, Fechado.
- Inclui um item "Selecionar todos / Limpar" no topo para conveniência.
- Default ao carregar a página: `["rascunho", "novo", "em_atendimento", "aguardando_cliente"]` (todos menos Resolvido e Fechado).
- Se nenhum status estiver marcado → mostra "Nenhum status selecionado" e a lista fica vazia (ou tratamos como "todos"; vou usar lista vazia = nenhum, comportamento previsível).
- Se todos estiverem marcados → exibe "Todos status".

## Arquivos a alterar

### `src/pages/Tickets.tsx`

1. Trocar `statusFilter: string` por `statusFilters: string[]` com default `["rascunho","novo","em_atendimento","aguardando_cliente"]`.
2. Filtro de tickets: `const matchesStatus = statusFilters.includes(ticket.status);`
3. Substituir o `<Select>` de status por um `<Popover>` + `<Button>` trigger + lista de `<Checkbox>` (ambos componentes já existem em `components/ui`).
4. Atualizar o empty-state condicional na linha ~715 para refletir o novo estado (ex.: comparar com o default).
5. Manter ordenação atual.

### Detalhes técnicos

- Usar `Popover` + `PopoverTrigger`/`PopoverContent` já disponíveis.
- Trigger: `<Button variant="outline" className="w-[200px] justify-between">` mostrando label dinâmico:
  - 0 selecionados → "Nenhum status"
  - 6 selecionados → "Todos status"
  - 1 selecionado → label do status
  - 2+ → "N status selecionados"
- Conteúdo: lista vertical com `<Checkbox>` + `<Label>` por status, mais um botão "Limpar" / "Selecionar todos".
- Sem mudanças de banco, hooks, ou outras páginas.

## Fora de escopo

- Persistência da seleção (localStorage) — não solicitado.
- Aplicar o mesmo padrão em `MyTickets.tsx` ou outras páginas — só o pedido foi a "fila de tickets" (`/tickets`).