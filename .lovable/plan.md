## Objetivo

Enriquecer o Dashboard com mais blocos analíticos baseados no padrão do Relatório Mensal:
1. **Distribuição por Prioridade** — ao lado da Distribuição por Segmento
2. **Top 5 Categorias** — bloco novo
3. **Resumo Numérico** — tabela de volume mensal (Abertos / Fechados / Saldo), disponível para **todos os perfis** (não só cliente)

Tudo em `src/pages/Dashboard.tsx`. Nenhuma alteração de banco ou regra de negócio.

---

## 1. Distribuição por Prioridade (P1–P4)

- Buscar contagem de tickets agrupados por `priority` em `loadDashboardStats()` (escopo coerente com o segmento atual: todos os tickets que o usuário enxerga via RLS, excluindo `record_type='rfc'` para manter a regra de exclusão de RFCs).
- Renderizar uma nova `DashboardSection title="Distribuição por Prioridade"` logo abaixo (ou ao lado) da seção "Distribuição por Segmento", com 4 cards (P1, P2, P3, P4) usando cores já padronizadas:
  - P1 vermelho, P2 laranja, P3 amarelo, P4 verde (mesmas do `useReportData`).
- Ícone da seção: `Flag` ou `AlertTriangle`.

## 2. Top 5 Categorias

- Buscar `category` dos tickets visíveis (mesma query que segmento) e agregar no client-side para top 5 (`category, count`).
- Novo `Card` "Top 5 Categorias" abaixo das seções de distribuição, com tabela: `# | Categoria | Qtd | %` (mesmo layout do relatório mensal).

## 3. Resumo Numérico para todos os perfis

- Hoje `useMonthlyTicketVolume` só é chamado quando `isClientUser`. Vamos chamá-lo para todos:
  - Cliente: `clientId = profile.client_id` (continua igual).
  - Otimizzo / Super Admin / Analista / Tenant Admin: `clientId = null` para retornar volume global (verificar no hook).
- Se o hook não suporta `null`, ajustar o hook para aceitar `null` e agregar todos os tickets visíveis (escopo atual já é definido por RLS).
- Renderizar `Card` "Resumo Numérico" com a mesma tabela do relatório mensal (Mês / Abertos / Fechados / Saldo + linha de total), reutilizando exatamente o markup das linhas 710–767 de `MonthlyClientReport.tsx`.
- Posicionar abaixo do gráfico "Tendência Mensal" já existente (que usa dados parecidos), formando dupla gráfico + tabela.

---

## Detalhes técnicos

- Arquivo único alterado: `src/pages/Dashboard.tsx`.
- Possível pequeno ajuste em `src/hooks/useMonthlyTicketVolume.ts` para aceitar `clientId === null` (todos os tenants visíveis ao usuário). Confirmo lendo o hook antes de implementar.
- Excluir `record_type = 'rfc'` em todas as novas queries para manter a regra global do projeto.
- Cores e badges reaproveitados: `PRIORITY_COLORS` em `useReportData.ts`; `getPriorityBadgeVariant` em `ticketUtils.tsx`.
- Layout: usar `grid md:grid-cols-2` quando combinar Distribuição por Segmento + Prioridade lado a lado, mantendo `DashboardSection` como wrapper (cada uma vira sua seção, mas posicionadas em uma row de 2 colunas em telas largas).

## Fora de escopo

- Sem mudanças em RLS, migrations ou edge functions.
- Sem alterações no relatório mensal.