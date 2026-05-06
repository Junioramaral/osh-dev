## Objetivo
No card **Pessoas** do sidebar do ticket (inclui RFC), permitir que analistas Otimizzo / Super Admin atribuam um analista diretamente, com o **time preenchido automaticamente** a partir do `team_id` do perfil do analista escolhido.

## Comportamento
- Quando o ticket está sem analista atribuído (ou para reatribuição), o card **Pessoas** mostra um `Select` "Atribuir analista" listando analistas Otimizzo ativos.
- Ao selecionar o analista:
  - `analyst_id` é gravado no ticket.
  - `team_id` é automaticamente definido com o `profiles.team_id` do analista (apenas se o ticket ainda não tiver time, ou sempre — confirmar abaixo).
  - Aplicar o lock (mesma lógica do `RequiredFieldsBeforeResolveDialog`): `lock_status = locked`, `lock_owner_id = analystId`, `lock_at = now()`, `unlocked_at = null`.
- Quando já existe analista, mostra avatar + nome (como hoje) com um botão pequeno "Alterar" (ícone) que reabre o select.
- Cliente comum e Viewer continuam vendo apenas leitura.
- Funciona para tickets normais e RFCs.

## Mudanças

### `src/components/tickets/TicketSidebar.tsx`
- No bloco **Pessoas**:
  - Se `isOtimizzoUser || isSuperAdmin` e ticket não está resolvido:
    - Mostrar `Select` inline para escolher analista (lista igual à do `RequiredFieldsBeforeResolveDialog`: `profiles` com `client_id = OTIMIZZO_TENANT_ID` e `is_active = true`, ordenado por `full_name`, com `team_id` no select).
    - Adicionar handler `handleAssignAnalyst(analystId)` que:
      1. Busca `team_id` do perfil escolhido (já vindo no payload do query).
      2. Faz `update` em `tickets`: `analyst_id`, `team_id` (se existir no perfil), e campos de lock.
      3. Invalida `ticket-detail` e `tickets`.
      4. Toast de sucesso/erro.
  - Quando já existe analista, adicionar botão "Alterar" (link/ghost) que troca o display pelo Select.
  - Campo "Time" continua exibindo `ticket.teams?.name` (vai refletir após o update).

## Pontos a confirmar
- Se o ticket já tem time atribuído diferente do time do analista, devo **sobrescrever** o time ao trocar de analista, ou manter o time atual?
- Permitir reatribuir analista quando já existe um (botão "Alterar"), ou apenas atribuir quando estiver vazio?

## Fora do escopo
- Não altera o fluxo do `RequiredFieldsBeforeResolveDialog` (resolução de ticket).
- Não cria seleção manual de time/fila no sidebar (apenas analista, com time automático).
- Não altera regras de RLS nem políticas.
