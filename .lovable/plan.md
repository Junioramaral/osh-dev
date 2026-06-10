## Objetivo

Transformar as telas **Máquinas**, **Banco de Dados** e **Aplicativos** em uma navegação em duas etapas (drill-down por cliente), com contagem por ambiente no card e criação contextualizada.

## Comportamento atual vs. proposto

**Hoje (Máquinas / Databases / Applications):** lista plana agrupada por cliente em accordion, com botão "Nova X" sempre visível no topo, e o formulário exige seleção do cliente.

**Proposto:**

### 1. Tela inicial (lista de clientes)
- Mostra um **card por cliente** que possui registros daquele tipo (máquina/banco/aplicativo).
- Cada card exibe:
  - Nome do cliente
  - Total de registros
  - Quebra por ambiente, ex.:
    ```text
    ATPPOA
    Produção: 3
    Homologação: 2
    QA: 1
    ```
- **Sem botão "Nova Máquina/Banco/Aplicativo"** nesta tela.
- Mantém busca por cliente.
- Clicar no card abre a **visão do cliente** (sem mudar de rota — estado interno `selectedClientId`, com botão "← Voltar").

### 2. Visão do cliente (lista de ativos)
- Cabeçalho: nome do cliente + botão "Voltar".
- Botão **"Nova Máquina/Banco/Aplicativo"** aparece **somente aqui** (respeitando permissão atual: `isSuperAdmin && !isViewer`).
- Lista os ativos do cliente, mantendo o agrupamento por ambiente, busca, paginação, ordenação e ações de editar/excluir já existentes.
- Ao abrir o dialog de criação, o `client_id` já vem **pré-preenchido e travado** (campo cliente oculto/somente-leitura) com o cliente do card.

## Arquivos afetados

- `src/pages/Machines.tsx` — adicionar estado `selectedClientId`, render condicional (cards de clientes ↔ detalhe do cliente), mover botão "Nova Máquina" para a visão de detalhe.
- `src/pages/Databases.tsx` — mesma transformação.
- `src/pages/Applications.tsx` — mesma transformação.
- `src/components/machines/MachineDialog.tsx` — aceitar prop opcional `lockedClientId`; quando presente, ocultar o select de cliente e enviar esse id.
- `src/components/databases/DatabaseDialog.tsx` — mesmo ajuste (`lockedClientId`).
- `src/components/applications/ApplicationInstanceDialog.tsx` — mesmo ajuste.

## Detalhes técnicos

- **Agrupamento para os cards:** reduzir os dados já carregados (`machines`/`databases`/`applications`) por `client_id` e por `environment`, usando o mapeamento de labels existente (`ENVIRONMENT_CONFIG` em `Machines.tsx` — reaproveitar nos outros para consistência: Produção, Homologação, QA, Desenvolvimento). Ambientes sem registros não aparecem.
- **Sem mudanças de schema** no Supabase — apenas UI/UX.
- **Sem mudanças de rota** — a navegação cliente→detalhe é via estado local para preservar filtros e cache do React Query.
- **Permissões:** mantêm-se as regras atuais; o botão de criação só renderiza para quem já tinha permissão.
- **Filtro de tipo/busca:** continuam disponíveis na visão de detalhe do cliente. Na visão de cards, mantemos apenas busca por nome de cliente (mais simples e útil nesse nível).

## Fora de escopo

- Não altera Tickets, Clientes ou demais telas.
- Não cria novas rotas.
- Não toca em lógica de negócio (RLS, edge functions, validações).
