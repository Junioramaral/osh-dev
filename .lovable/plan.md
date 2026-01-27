

## Reorganização dos Cards do Dashboard

Este plano propõe uma reorganização visual dos cards KPI do Dashboard em blocos temáticos, melhorando a escaneabilidade e a experiência do usuário.

---

### Problema Atual

Observando o screenshot, os cards estão distribuídos em um grid único de 5 colunas sem agrupamento lógico:
- Cards de SLA (Taxa de Resolução, Tempo Médio) misturados com contadores de tickets
- Cards de segmento (Tickets DB, Tickets APP) separados visualmente
- Não há hierarquia visual clara entre métricas operacionais e informativas

---

### Proposta de Organização

Agrupar os cards em **3 blocos temáticos** com títulos de seção:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VISÃO GERAL DE TICKETS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Total de  │ │   Tickets   │ │  Abertos    │ │    Em       │            │
│  │   Tickets   │ │  Fechados   │ │   Hoje      │ │ Atendimento │            │
│  │      6      │ │      4      │ │      0      │ │      0      │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐                                            │
│  │ Aguardando  │ │ Retornados  │                                            │
│  │  Cliente    │ │  à Fila     │                                            │
│  │      0      │ │      0      │                                            │
│  └─────────────┘ └─────────────┘                                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERFORMANCE E SLA                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                            │
│  │   Taxa de   │ │ Tempo Médio │ │  Fora do    │                            │
│  │  Resolução  │ │ Resolução   │ │    SLA      │                            │
│  │    0%       │ │   5d 6h     │ │      2      │                            │
│  └─────────────┘ └─────────────┘ └─────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         DISTRIBUIÇÃO POR SEGMENTO                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                            │
│  │ Tickets DB  │ │ Tickets APP │ │   Total de  │                            │
│  │      4      │ │      2      │ │  Clientes   │                            │
│  │             │ │             │ │      3      │                            │
│  └─────────────┘ └─────────────┘ └─────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Alterações no Dashboard.tsx

#### 1. Separar os cards em grupos temáticos

Reorganizar o array `statCards` em 3 grupos distintos:

```typescript
// Grupo 1: Visão Geral de Tickets
const ticketOverviewCards = [
  { title: "Total de Tickets", value: stats.totalTickets, icon: Ticket, ... },
  { title: "Tickets Fechados", value: stats.ticketsFechados, icon: CheckCircle, ... },
  { title: "Abertos Hoje", value: stats.ticketsAbertosHoje, icon: TrendingUp, ... },
  { title: "Em Atendimento", value: stats.ticketsEmAtendimento, icon: Clock, ... },
  { title: "Aguardando Cliente", value: stats.ticketsAguardando, icon: AlertTriangle, ... },
  // Retornados à Fila (condicional)
];

// Grupo 2: Performance e SLA
const slaPerformanceCards = [
  { title: "Taxa de Resolução SLA", ... },
  { title: "Tempo Médio de Resolução", ... },
  { title: "Fora do SLA", ... },
];

// Grupo 3: Distribuição
const distributionCards = [
  { title: "Tickets DB", ... },
  { title: "Tickets APP", ... },
  { title: "Total de Clientes", ... }, // condicional
];
```

#### 2. Criar componente de seção reutilizável

```tsx
interface DashboardSectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

const DashboardSection = ({ title, icon: Icon, children }: DashboardSectionProps) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-4 h-4" />
      <h3 className="text-sm font-medium uppercase tracking-wider">{title}</h3>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  </div>
);
```

#### 3. Nova estrutura do JSX

```tsx
<div className="space-y-8">
  {/* Hero Section - mantém como está */}
  
  {loading ? (
    // Loading skeleton
  ) : (
    <div className="space-y-8">
      {/* Seção 1: Visão Geral de Tickets */}
      <DashboardSection title="Visão Geral de Tickets" icon={Ticket}>
        {ticketOverviewCards.map(card => <StatCard key={card.title} {...card} />)}
      </DashboardSection>
      
      {/* Seção 2: Performance e SLA */}
      <DashboardSection title="Performance e SLA" icon={Target}>
        {slaPerformanceCards.map(card => <StatCard key={card.title} {...card} />)}
      </DashboardSection>
      
      {/* Seção 3: Distribuição por Segmento */}
      <DashboardSection title="Distribuição por Segmento" icon={Database}>
        {distributionCards.map(card => <StatCard key={card.title} {...card} />)}
      </DashboardSection>
    </div>
  )}
  
  {/* Alerta SLA - mantém como está */}
  {/* Gráficos - mantém como está */}
</div>
```

---

### Benefícios da Reorganização

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Hierarquia** | Cards soltos sem agrupamento | Seções temáticas claras |
| **Escaneabilidade** | Difícil localizar métricas específicas | Fácil identificar categoria |
| **Espaçamento** | Grid único de 5 colunas | Grids de 4 colunas por seção |
| **Contexto** | Métricas misturadas | Agrupamento lógico |

---

### Alternativa: Card Container (Wrapper)

Se preferir uma abordagem mais visual, cada seção pode ser envolvida em um Card pai com borda suave:

```tsx
<Card className="p-6 bg-muted/30 border-dashed">
  <CardTitle className="text-sm mb-4">Visão Geral de Tickets</CardTitle>
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {/* Cards internos */}
  </div>
</Card>
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Dashboard.tsx` | Reorganizar cards em grupos, adicionar títulos de seção |

---

### Resumo das Alterações

1. Separar `statCards` em 3 arrays temáticos
2. Adicionar títulos de seção com ícones
3. Ajustar grid para 4 colunas por seção (melhor simetria)
4. Adicionar espaçamento vertical entre seções (`space-y-8`)
5. Opcionalmente, envolver cada seção em um Card container para destaque visual

