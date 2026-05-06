## Objetivo

Na aba **RFC** do ticket (visualização antes/depois da aprovação), permitir expandir cada passo da tabela "Passos" para visualizar o **procedimento detalhado** e os **scripts/comandos** já cadastrados na RFC — informações que hoje só aparecem no modo de execução.

## Mudanças

### `src/components/tickets/TicketRFCReport.tsx`
- Adicionar estado local `expandedSteps: Set<string>` para controlar quais linhas estão abertas.
- Em cada linha da tabela de passos, incluir uma coluna inicial com botão chevron (ChevronRight / ChevronDown) que alterna a expansão.
- Quando expandida, renderizar uma `TableRow` adicional com `colSpan` total contendo dois blocos:
  - **Procedimento detalhado** — texto formatado (`whitespace-pre-wrap`) a partir de `step.procedimento`. Sempre visível.
  - **Scripts / Comandos** — bloco monoespaçado com fundo escuro (`bg-muted` / `font-mono`) a partir de `step.scripts`. Visível apenas para usuários internos (`isOtimizzoUser || isSuperAdmin`), respeitando a regra existente de ocultar scripts para clientes.
- Se um passo não tiver procedimento nem scripts (ou cliente sem procedimento), exibir mensagem discreta "Sem detalhes adicionais".
- Adicionar botão "Expandir todos / Recolher todos" acima da tabela para conveniência.

### Sem alterações de backend
Os campos `procedimento` e `scripts` já existem em `rfc_steps` e já são retornados pelo hook `useTicketRFCSteps`. Nada a mudar em SQL, RLS ou edge functions.

## Aspectos visuais
- Manter o layout atual da tabela; a linha expandida usa fundo `bg-muted/30` para destacar.
- Ícones via `lucide-react` (`ChevronRight`, `ChevronDown`, `FileText`, `Terminal`).
- Tokens semânticos do design system (sem cores hardcoded).

## Fora do escopo
- Não altera a tela de execução de passos (`RFCExecution`) nem o portal do cliente.
- Não altera a política de visibilidade de scripts para clientes.
