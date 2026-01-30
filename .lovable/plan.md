
# Plano: Relatorio Gerencial de Horas dos Analistas

## Objetivo

Criar um relatorio gerencial completo que compare:
1. **Horas de Vida do Ticket** - Tempo total desde a criacao ate a resolucao (ou momento atual se nao resolvido)
2. **Horas Lancadas** - Total de horas registradas manualmente pelos analistas
3. **Diferenca** - Gap entre tempo de vida e horas efetivamente lancadas

Este relatorio permite identificar tickets com baixa ou nenhuma documentacao de horas trabalhadas.

---

## Estrutura do Relatorio

### Filtros Disponiveis
- **Periodo**: Mes Atual, Mes Anterior, Ultimos 3 meses, Ultimos 6 meses
- **Cliente**: Todos ou cliente especifico
- **Analista**: Todos ou analista especifico
- **Segmento**: Todos, DB, APP

---

## Secoes do Relatorio

### 1. Cards de Resumo Executivo
```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  [Clock] Total Horas Vida   [FileText] Total Lancadas   [Calculator] Diferenca   [%] Taxa de Registro
│       487.5h                      312.0h                   175.5h                   64%
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Tabela Principal - Por Cliente
```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Cliente       │ Tickets │ Horas Vida │ Horas Lancadas │ Diferenca │ Taxa    │ Analista Principal │
├───────────────┼─────────┼────────────┼────────────────┼───────────┼─────────┼────────────────────┤
│ lexisflow     │    15   │   156.2h   │     98.5h      │   57.7h   │  63%    │ Junior Amaral      │
│ sec4file      │     8   │    82.3h   │     45.0h      │   37.3h   │  55%    │ Ana Costa          │
│ total geral   │    23   │   238.5h   │    143.5h      │   95.0h   │  60%    │ -                  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3. Tabela Detalhada - Por Ticket
```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ # Ticket   │ Cliente    │ Titulo                      │ Status    │ Horas Vida │ Horas Lancadas │ Diferenca │ Taxa │
├────────────┼────────────┼─────────────────────────────┼───────────┼────────────┼────────────────┼───────────┼──────┤
│ 00000006   │ lexisflow  │ Problema com conexao        │ Aberto    │   114.8h   │      2.0h      │  112.8h   │  2%  │
│ 00000005   │ lexisflow  │ Apoiar o time VPN           │ Resolvido │     0.7h   │      0.0h      │    0.7h   │  0%  │
│ 00000001   │ lexisflow  │ Problema com Login          │ Resolvido │   484.2h   │      0.0h      │  484.2h   │  0%  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4. Graficos

#### 4.1 Grafico de Barras Comparativo
- Barras agrupadas mostrando Horas de Vida vs Horas Lancadas por cliente

#### 4.2 Grafico de Rosca - Taxa de Registro
- Distribuicao visual da taxa de registro de horas

#### 4.3 Top 10 Tickets com Maior Diferenca
- Lista de tickets que precisam de atencao (maior gap de horas)

---

## Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/components/reports/AnalystHoursManagementReport.tsx` | Componente principal do relatorio |
| `src/hooks/useAnalystHoursManagementData.ts` | Hook para buscar e processar dados |

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Reports.tsx` | Adicionar novo tipo de relatorio na lista |

---

## Estrutura de Dados

### Interface do Hook
```typescript
interface TicketHoursDetail {
  ticket_id: string;
  ticket_number: string;
  title: string;
  client_id: string;
  client_name: string;
  analyst_id: string | null;
  analyst_name: string | null;
  status: string;
  segment: string;
  created_at: string;
  resolved_at: string | null;
  lifetime_hours: number;      // created_at -> resolved_at (ou now)
  logged_hours: number;        // soma de ticket_time_logs.hours
  difference_hours: number;    // lifetime - logged
  coverage_rate: number;       // (logged / lifetime) * 100
}

interface ClientHoursSummary {
  client_id: string;
  client_name: string;
  ticket_count: number;
  total_lifetime_hours: number;
  total_logged_hours: number;
  total_difference: number;
  coverage_rate: number;
  top_analyst: string | null;
}

interface AnalystHoursManagementData {
  tickets: TicketHoursDetail[];
  byClient: ClientHoursSummary[];
  overall: {
    total_tickets: number;
    total_lifetime_hours: number;
    total_logged_hours: number;
    total_difference: number;
    coverage_rate: number;
    unique_clients: number;
    unique_analysts: number;
  };
}
```

---

## Logica de Calculo

### Horas de Vida (Lifetime Hours)
```typescript
const lifetimeHours = (resolvedAt || now) - createdAt;
// Em horas decimais
```

### Horas Lancadas (Logged Hours)
```typescript
const loggedHours = SUM(ticket_time_logs.hours) WHERE ticket_id = ticket.id;
```

### Diferenca
```typescript
const difference = lifetimeHours - loggedHours;
```

### Taxa de Cobertura
```typescript
const coverageRate = lifetimeHours > 0 
  ? (loggedHours / lifetimeHours) * 100 
  : 0;
```

---

## Indicadores Visuais

| Taxa de Cobertura | Cor Badge | Significado |
|------------------|-----------|-------------|
| >= 80%           | Verde     | Excelente registro |
| >= 50%           | Amarelo   | Registro moderado |
| < 50%            | Vermelho  | Atencao necessaria |

---

## Query SQL Base

```sql
SELECT 
  t.id as ticket_id,
  t.ticket_number,
  t.title,
  t.client_id,
  t.analyst_id,
  t.status,
  t.segment,
  t.created_at,
  t.resolved_at,
  c.name as client_name,
  p.full_name as analyst_name,
  -- Horas de vida: created_at ate resolved_at (ou agora)
  EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, NOW()) - t.created_at)) / 3600 as lifetime_hours,
  -- Horas lancadas: soma dos time logs
  COALESCE(SUM(ttl.hours), 0) as logged_hours
FROM tickets t
JOIN clients c ON c.id = t.client_id
LEFT JOIN profiles p ON p.id = t.analyst_id
LEFT JOIN ticket_time_logs ttl ON ttl.ticket_id = t.id
WHERE t.created_at >= :startDate AND t.created_at <= :endDate
GROUP BY t.id, t.ticket_number, t.title, t.client_id, t.analyst_id, 
         t.status, t.segment, t.created_at, t.resolved_at, c.name, p.full_name
ORDER BY (EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, NOW()) - t.created_at)) / 3600 - COALESCE(SUM(ttl.hours), 0)) DESC
```

---

## Informacoes Adicionais Sugeridas

### 1. Analise por Projeto
- Mostrar distribuicao de horas lancadas por projeto (normal vs hora-extra)
- Badge HE para projetos de hora-extra

### 2. Tickets sem Nenhum Lancamento
- Destacar tickets que nao tem nenhum registro de horas
- Filtro rapido: "Apenas tickets sem lancamentos"

### 3. Media por Analista
- Tabela mostrando media de taxa de cobertura por analista
- Ranking de analistas por disciplina de registro

### 4. Evolucao Temporal
- Grafico de linha mostrando evolucao da taxa de cobertura ao longo dos meses

### 5. Alertas Automaticos
- Badge de alerta em tickets abertos com mais de 24h sem lancamentos

---

## Restricao de Acesso

Este relatorio sera marcado como `internalOnly: true`, assim como o relatorio "Horas por Cliente", garantindo que apenas usuarios internos (Otimizzo, SuperAdmin, Viewer) possam acessa-lo.

---

## Fluxo de Uso

```text
1. Usuario acessa "Relatorios"
2. Clica em "Gestao de Horas Analistas"
3. Seleciona filtros (periodo, cliente, analista)
4. Visualiza resumo executivo
5. Analisa tabela por cliente
6. Detalha por ticket para identificar gaps
7. Exporta PDF se necessario
```

---

## Layout Print/PDF

```text
┌─────────────────────────────────────────────────────────────────┐
│  [CAPA]                                                         │
│  Relatorio Gerencial de Horas                                   │
│  Periodo: Janeiro 2026                                          │
├─────────────────────────────────────────────────────────────────┤
│  [PAGINA 1] Resumo Executivo + Graficos                         │
├─────────────────────────────────────────────────────────────────┤
│  [PAGINA 2] Tabela por Cliente                                  │
├─────────────────────────────────────────────────────────────────┤
│  [PAGINA 3+] Tabela Detalhada por Ticket                        │
├─────────────────────────────────────────────────────────────────┤
│  [RODAPE] Otimizzo Service Hub - Confidencial                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Componentes Reutilizados

- `ReportCover` - Capa padrao
- `ReportFooter` - Rodape padrao
- `PrintPage` - Container de pagina para impressao
- Componentes Shadcn: Table, Card, Badge, Select, Button
- Recharts: BarChart, PieChart
