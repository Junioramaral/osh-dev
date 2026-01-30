
# Plano: Relatório de Horas por Cliente

## Resumo

Criar um novo relatório para visualizar as horas trabalhadas por cliente, com gráficos mostrando a distribuição por analista, fila, time e tipo de ticket.

## Estrutura de Dados Existente

A tabela `ticket_time_logs` já está disponível com:
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Identificador único |
| ticket_id | uuid | FK para tickets |
| analyst_id | uuid | FK para profiles |
| hours | numeric | Horas trabalhadas |
| logged_at | timestamp | Data/hora do registro |
| description | text | Descrição do trabalho |

A partir do `ticket_id` podemos acessar: `client_id`, `queue_id`, `team_id`, `ticket_type`, `priority`, `category`.

---

## Arquivos a Criar

### 1. `src/hooks/useClientHoursData.ts`

Hook para buscar e processar dados de horas por cliente.

**Dados retornados:**
```typescript
interface ClientHoursData {
  client_id: string;
  client_name: string;
  total_hours: number;
  by_analyst: { analyst_name: string; hours: number }[];
  by_queue: { queue_name: string; hours: number }[];
  by_team: { team_name: string; hours: number }[];
  by_type: { type_name: string; hours: number }[];
  overall: {
    total_hours: number;
    total_entries: number;
    avg_hours_per_entry: number;
  };
}
```

**Query principal:**
```typescript
supabase
  .from("ticket_time_logs")
  .select(`
    id,
    hours,
    logged_at,
    analyst_id,
    profiles!ticket_time_logs_analyst_id_fkey(full_name),
    tickets!inner(
      client_id,
      queue_id,
      team_id,
      ticket_type,
      priority,
      category,
      clients(name),
      queues(name),
      teams(name)
    )
  `)
  .gte("logged_at", startDate)
  .lte("logged_at", endDate)
```

### 2. `src/components/reports/ClientHoursReport.tsx`

Componente do relatório seguindo o padrão existente.

**Estrutura:**
- Header com botão voltar e exportar PDF
- Filtros: Período, Cliente (opcional), Segmento
- Cards de resumo: Total de horas, Média por ticket, Número de registros
- Gráficos:
  - **Por Analista**: BarChart horizontal mostrando horas por analista
  - **Por Fila**: PieChart com distribuição de horas por fila
  - **Por Time**: BarChart com horas por time
  - **Por Tipo de Ticket**: BarChart com horas por tipo (Incidente, Problema, etc.)
- Tabela detalhada por cliente

---

## Gráficos Planejados

```text
┌────────────────────────────────────────────────────────────┐
│                 RESUMO GERAL                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Total    │  │ Média/   │  │ Registros│  │ Analistas│   │
│  │ 127.5h   │  │ Ticket   │  │ 48       │  │ 5        │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│           HORAS POR ANALISTA (BarChart Horizontal)         │
│                                                            │
│  João     ████████████████████████████ 45.5h               │
│  Maria    ██████████████████ 32.0h                         │
│  Pedro    █████████████ 25.0h                              │
│  Ana      ██████████ 15.0h                                 │
│  Carlos   ██████ 10.0h                                     │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│           HORAS POR FILA (PieChart)                        │
│                                                            │
│               ┌───────────┐                                │
│            ╱              ╲      Suporte N1: 35%           │
│          ╱                  ╲    Suporte N2: 28%           │
│         │                    │   Suporte N3: 22%           │
│          ╲                  ╱    Desenvolvimento: 15%      │
│            ╲              ╱                                │
│               └───────────┘                                │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│           HORAS POR TIME (BarChart Vertical)               │
│                                                            │
│   80h │                                                    │
│   60h │    ▓▓▓                                             │
│   40h │    ▓▓▓     ▓▓▓                                     │
│   20h │    ▓▓▓     ▓▓▓     ▓▓▓     ▓▓▓                     │
│       └────────────────────────────────                    │
│          Time DB  Time APP Time Suporte                    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│        HORAS POR TIPO DE TICKET (BarChart Vertical)        │
│                                                            │
│   50h │    ▓▓▓                                             │
│   40h │    ▓▓▓     ▓▓▓                                     │
│   30h │    ▓▓▓     ▓▓▓     ▓▓▓                             │
│   20h │    ▓▓▓     ▓▓▓     ▓▓▓     ▓▓▓                     │
│       └────────────────────────────────                    │
│        Incidente Problema Dúvida  Service Req              │
└────────────────────────────────────────────────────────────┘
```

---

## Alteração no Reports.tsx

Adicionar o novo tipo de relatório na lista:

```typescript
{
  id: "client-hours" as const,
  title: "Horas por Cliente",
  description: "Total de horas trabalhadas por cliente, analista, fila, time e tipo",
  icon: Clock,
  highlight: false,
  internalOnly: true, // Apenas usuários internos
}
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useClientHoursData.ts` | Criar novo hook |
| `src/components/reports/ClientHoursReport.tsx` | Criar novo componente |
| `src/pages/Reports.tsx` | Adicionar novo tipo de relatório |

---

## Funcionalidades

1. **Filtros disponíveis:**
   - Período (Mês Atual, Mês Anterior, Últimos 3 meses, Últimos 6 meses)
   - Cliente específico (dropdown com todos os clientes)
   - Segmento (Todos, DB, APP)

2. **Cards de resumo:**
   - Total de Horas
   - Média de Horas por Registro
   - Total de Registros
   - Analistas Ativos

3. **Gráficos:**
   - Horas por Analista (BarChart horizontal - mostra primeiro nome)
   - Distribuição por Fila (PieChart)
   - Horas por Time (BarChart vertical)
   - Horas por Tipo de Ticket (BarChart vertical)

4. **Tabela detalhada:**
   - Cliente | Total Horas | Registros | Média/Registro | Principal Analista

5. **Exportação PDF:**
   - Segue padrão existente com `window.print()`
   - Nome do arquivo: `Horas_Cliente_[Periodo].pdf`

---

## Notas Técnicas

1. **Relacionamentos no Supabase:**
   - `ticket_time_logs.analyst_id` -> `profiles.id`
   - `ticket_time_logs.ticket_id` -> `tickets.id`
   - `tickets.client_id` -> `clients.id`
   - `tickets.queue_id` -> `queues.id`
   - `tickets.team_id` -> `teams.id`

2. **Formatação de horas:**
   - Exibir com uma casa decimal (ex: "45.5h")
   - Converter para dias quando > 24h (ex: "2d 5.5h")

3. **Labels de tipos de ticket:**
   - Usar função existente `getTicketTypeLabel()` de `src/lib/ticketUtils.tsx`

4. **Permissões:**
   - Relatório marcado como `internalOnly: true`
   - Apenas usuários Otimizzo/SuperAdmin podem visualizar
