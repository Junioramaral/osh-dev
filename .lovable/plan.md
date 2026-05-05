## 1. Dashboard CSAT — filtro por mês/ano

### Estado atual
Hoje só existem presets fixos por dias (7/30/60/90), aplicados sobre `created_at` dos tickets resolvidos.

### Mudanças
Substituir o seletor "Período" por um **filtro padronizado** seguindo o mesmo padrão dos outros relatórios (`ReportPeriodFilter` + `reportPeriod.ts`):

- **Mês Atual**
- **Mês Anterior**
- **Últimos 3 meses**
- **Últimos 6 meses**
- **Mês Específico** (escolher mês + ano)
- **Comparativo** (mês A vs mês B) — opcional, ver item 3

O filtro continuará usando os filtros existentes de **Segmento** e **Cliente**.

### Critério de data
Mudar de `created_at >= startDate` para um intervalo `[start, end]` baseado em **`csat_submitted_at`** (data da avaliação) — assim o filtro reflete *quando o cliente avaliou*, não quando o ticket foi aberto. Tickets sem CSAT entram no denominador da taxa de resposta usando `resolved_at` no mesmo intervalo.

### Arquivos
- `src/hooks/useCSATData.ts` — aceitar `{ startDate, endDate }` em vez de `days`; filtrar por `csat_submitted_at` para os agregados de avaliações e `resolved_at` para o total de resolvidos.
- `src/pages/CSATDashboard.tsx` — trocar Select de dias por `ReportPeriodFilter`; adaptar gráfico de evolução para granularidade adequada (diária para 1 mês, mensal para 3/6 meses).

---

## 2. Novo Relatório: "Satisfação dos Clientes"

### Onde fica
Adicionar um novo card em `src/pages/Reports.tsx` chamado **"Satisfação dos Clientes (CSAT)"**, ícone `Star`, ao lado dos outros relatórios. Componente novo: `src/components/reports/CSATSatisfactionReport.tsx`.

### Dados disponíveis (já no schema `tickets`)
Para cada ticket avaliado temos:
- `ticket_number`, `id` (link)
- `csat_rating` (1–5), `csat_comment`, `csat_submitted_at`, `feedback_token`
- `client_id` → nome do cliente
- `analyst_id` → nome do analista
- `segment` (DB/APP), `priority` (P1–P4), `record_type`
- `category`, `subcategory`
- `created_at`, `resolved_at`, `started_at`
- `sla_first_response_met`, `sla_resolution_met`
- `contact_name`, `contact_email` (quem abriu)

### Estrutura proposta

**a) Cabeçalho com filtros (`ReportPeriodFilter`)**
- Período (single ou comparação) — mesmo padrão dos outros relatórios
- Cliente (todos / específico)
- Segmento (todos / DB / APP)
- Analista (todos / específico)
- Faixa de nota (todas / promotores 4–5 / neutros 3 / detratores 1–2)

**b) KPIs em destaque**
- CSAT médio (com cor por faixa)
- Total de avaliações
- Taxa de resposta (avaliados / resolvidos)
- % Promotores | % Neutros | % Detratores
- NPS simplificado (`%Promotores − %Detratores`)
- Variação vs período anterior (delta)

**c) Gráficos**
- Evolução do CSAT médio (linha) ao longo do período
- Distribuição de notas (barras horizontais 1★–5★)
- CSAT por segmento (DB vs APP)
- CSAT por prioridade (P1–P4)
- Top 5 clientes mais satisfeitos / Bottom 5 menos satisfeitos

**d) Tabela detalhada — núcleo analítico**
Uma linha por ticket avaliado, exportável em CSV/PDF, com:

| Coluna | Origem |
|---|---|
| Nº Ticket (link) | `ticket_number` |
| Data da avaliação | `csat_submitted_at` |
| Cliente | `clients.name` |
| Segmento | `segment` |
| Prioridade | `priority` |
| Categoria / Subcategoria | `category`, `subcategory` |
| Analista | `profiles.full_name` |
| Quem abriu | `contact_name` |
| Tempo até resolução | `resolved_at − created_at` |
| SLA 1ª resposta | `sla_first_response_met` |
| SLA resolução | `sla_resolution_met` |
| Nota | `csat_rating` (com estrelas) |
| Comentário | `csat_comment` |

Ordenação padrão: nota crescente (detratores no topo, para análise) + data desc.

**e) Seção "Insights"**
- Top 5 analistas com melhor CSAT (mín. 3 avaliações)
- Top 5 com pior CSAT
- Categorias com pior nota média (oportunidades de melhoria)
- Lista de detratores (≤ 2★) com comentário, agrupados por cliente
- Correlação simples: CSAT médio quando SLA cumprido vs não cumprido

**f) Exportação**
- Botão "Imprimir / PDF" via `PrintPage`/`window.print` (padrão dos outros relatórios)
- Botão "Exportar CSV" da tabela detalhada

### Arquivos novos/afetados
- **Novo**: `src/components/reports/CSATSatisfactionReport.tsx`
- **Novo**: `src/hooks/useCSATSatisfactionReport.ts` (busca tickets + agregações)
- `src/pages/Reports.tsx` — registrar novo card e roteamento (`"csat-satisfaction"`)
- Reutilizar `ReportPeriodFilter`, `PrintPage`, `ReportFooter` existentes

### RFCs e RLS
- Excluir `record_type = 'rfc'` dos cálculos (regra Core do projeto)
- Visibilidade respeita RLS atual: cliente vê só seus tickets; Otimizzo/super_admin veem todos; viewer vê do tenant

---

## 3. Modo comparativo no Dashboard CSAT (opcional, mesma entrega)

Permitir alternar para comparação A vs B (mês X vs mês Y) reutilizando o `ReportPeriodFilter`. Quando ativo, KPIs mostram lado a lado e gráfico de evolução exibe duas linhas.

---

## Ordem de execução
1. Refatorar `useCSATData` para aceitar intervalo de datas
2. Trocar filtro do `CSATDashboard` por `ReportPeriodFilter` (single + comparação)
3. Criar `useCSATSatisfactionReport`
4. Criar `CSATSatisfactionReport` com KPIs, gráficos, tabela e exportação
5. Registrar card no `Reports.tsx`