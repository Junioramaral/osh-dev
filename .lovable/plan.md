## Objetivo
Incluir os status `aguardando_aprovacao` ("Aguardando Aprovação") e `aprovado` ("Aprovado") nos filtros padrão de status, tanto na tela **Tickets** quanto em **Meus Tickets**.

## Mudanças

### `src/pages/Tickets.tsx`
- As opções já existem em `STATUS_OPTIONS` (adicionadas anteriormente).
- Atualizar `DEFAULT_STATUS_FILTERS` para incluir os dois novos valores:
  ```ts
  const DEFAULT_STATUS_FILTERS = [
    "rascunho", "novo", "em_atendimento",
    "aguardando_cliente", "aguardando_aprovacao", "aprovado"
  ];
  ```

### `src/pages/MyTickets.tsx`
- O select de status hoje é estático e não inclui os status de RFC. Adicionar duas opções:
  ```tsx
  <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
  <SelectItem value="aprovado">Aprovado</SelectItem>
  ```
- Posicioná-las após "Aguardando Cliente" para manter ordem coerente com Tickets.
- Remover `"fechado"` do select (regra do projeto: não exibir "Fechado" em menus de UI).

## Fora do escopo
- Não altera prioridades de ordenação por status, lógica de RFC, ou backend.
