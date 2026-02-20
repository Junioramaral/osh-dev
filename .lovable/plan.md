
# Tela de Execução de RFC

## Visão Geral

Será criada uma nova página dedicada à execução de RFCs pelo time técnico, acessível via `/rfc-execution`. A tela lista todas as RFCs com status `aprovado`, e ao abrir uma RFC exibe um checklist interativo com barra de progresso em tempo real.

---

## Estrutura de Arquivos

### Novos arquivos:
- `src/pages/RFCExecution.tsx` — página principal com lista de RFCs aprovadas
- `src/components/rfc/RFCExecutionCard.tsx` — card lateral de detalhes + checklist de uma RFC aberta

### Arquivos a modificar:
- `src/App.tsx` — adicionar rota `/rfc-execution`
- `src/components/layout/AppLayout.tsx` — adicionar link de navegação "Execução RFC" (visível apenas para Otimizzo e Super Admin)

---

## Banco de Dados

### Status `aprovado`

O enum `ticket_status` atual precisa incluir o valor `aprovado`. Verificando a migration anterior, o enum tem: `novo`, `em_atendimento`, `aguardando_cliente`, `resolvido`, `fechado`, `aguardando_aprovacao`. O valor `aprovado` precisa ser adicionado.

**Migration necessária:**
```sql
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'aprovado';
```

### Atualização de `rfc_steps.status_concluido`

A tabela `rfc_steps` já existe com a coluna `status_concluido boolean`. A RLS atual permite que Otimizzo gerencie todos os steps (ALL), então o UPDATE funcionará corretamente.

---

## Página Principal: `RFCExecution.tsx`

### Layout de duas colunas (lista + detalhes)

```
┌─────────────────────────┬──────────────────────────────────────┐
│  RFCs Aprovadas (lista) │  Detalhes + Checklist da RFC         │
│                         │                                       │
│  [RFC-00000042]         │  ┌─────────────────────────────────┐ │
│  Cliente: Acme Corp     │  │ Progresso: 2/5 (40%)            │ │
│  Segmento: DB           │  │ ████████░░░░░░░░░░░░░           │ │
│  Status: Aprovado       │  └─────────────────────────────────┘ │
│                         │                                       │
│  [RFC-00000039]         │  Cabeçalho:                          │
│  ...                    │  Cliente: Acme Corp | Segmento: DB   │
│                         │  Título: Migração Oracle → Postgres  │
│                         │                                       │
│                         │  Checklist:                          │
│                         │  ☑ 1. Fazer backup completo          │
│                         │  ☐ 2. Instalar PostgreSQL            │
│                         │  ☐ 3. Migrar schema                  │
│                         │  ☐ 4. Migrar dados                   │
│                         │  ☐ 5. Validar integridade            │
└─────────────────────────┴──────────────────────────────────────┘
```

### Queries de dados

**Lista de RFCs aprovadas:**
```typescript
const { data: rfcs } = useQuery({
  queryKey: ['rfc-approved-list'],
  queryFn: async () => {
    return supabase
      .from('tickets')
      .select(`
        id, ticket_number, title, segment, status, created_at,
        clients(name)
      `)
      .eq('record_type', 'rfc')
      .eq('status', 'aprovado')
      .order('created_at', { ascending: false });
  }
});
```

**Passos da RFC selecionada:**
```typescript
const { data: steps } = useQuery({
  queryKey: ['rfc-steps', selectedRfcId],
  queryFn: async () => {
    return supabase
      .from('rfc_steps')
      .select('*')
      .eq('ticket_id', selectedRfcId)
      .order('ordem');
  },
  enabled: !!selectedRfcId
});
```

---

## Componente de Checklist: Lógica de Atualização em Tempo Real

Quando o técnico marca/desmarca um checkbox, o sistema:

1. Faz UPDATE otimista no estado local (UI atualiza imediatamente)
2. Envia `UPDATE` para o Supabase em `rfc_steps` alterando `status_concluido`
3. Invalida a query para recarregar caso haja inconsistência

```typescript
const toggleStep = async (stepId: string, currentValue: boolean) => {
  // 1. Atualização otimista local
  queryClient.setQueryData(['rfc-steps', selectedRfcId], (old) =>
    old?.map(s => s.id === stepId ? { ...s, status_concluido: !currentValue } : s)
  );
  
  // 2. Persistir no banco
  await supabase
    .from('rfc_steps')
    .update({ status_concluido: !currentValue, updated_at: new Date().toISOString() })
    .eq('id', stepId);
  
  // 3. Invalidar para garantir consistência
  queryClient.invalidateQueries({ queryKey: ['rfc-steps', selectedRfcId] });
};
```

---

## Barra de Progresso

Calculada dinamicamente a partir dos steps carregados:

```typescript
const completedCount = steps.filter(s => s.status_concluido).length;
const totalCount = steps.length;
const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
```

Exibida com o componente `<Progress>` do shadcn/ui (já presente no projeto) e um texto `X/Y passos concluídos (Z%)`.

Quando todos os passos estiverem concluídos (100%), exibe um banner de sucesso verde com a mensagem "Todos os passos concluídos!" e um botão para marcar a RFC como "Concluída".

---

## Navegação: Adicionar ao Sidebar

Em `AppLayout.tsx`, dentro de `operationalNav`, adicionar:

```typescript
{ 
  name: "Execução RFC", 
  href: "/rfc-execution", 
  icon: ClipboardCheck,    // lucide-react
  show: isOtimizzoUser || isSuperAdmin 
}
```

---

## Detalhes do Cabeçalho da RFC

Ao selecionar uma RFC, o painel direito exibe:

| Campo | Valor |
|---|---|
| Número | ticket_number |
| Título | title |
| Cliente | clients.name |
| Segmento | segment (badge colorido: DB = azul, APP = verde) |
| Status | Aprovado (badge verde) |
| Criado em | created_at formatado pt-BR |

---

## Comportamento no Mobile

No mobile, a lista e os detalhes ocupam 100% da tela alternadamente. Ao clicar em uma RFC da lista, o painel de detalhes é exibido com um botão "← Voltar" para retornar à lista. Isso é implementado com um estado `selectedRfcId` e layout condicional usando as classes `hidden` / `block` do Tailwind.

---

## Sequência de Implementação

```text
1. Migration SQL
   └─ Adiciona 'aprovado' ao enum ticket_status

2. Cria RFCExecution.tsx
   └─ Lista de RFCs aprovadas (coluna esquerda)
   └─ Painel de detalhes + checklist (coluna direita)
   └─ Lógica de toggle com atualização otimista
   └─ Barra de progresso calculada dinamicamente

3. Modifica App.tsx
   └─ Adiciona <Route path="/rfc-execution" element={<RFCExecution />} />

4. Modifica AppLayout.tsx
   └─ Adiciona "Execução RFC" na navegação (visível para Otimizzo/SuperAdmin)
```

---

## O que NÃO muda

- Fluxo de criação de tickets (Suporte e RFC)
- Tabela `rfc_steps` e suas políticas RLS
- Todas as outras páginas e componentes existentes
- Lógica de autenticação e permissões
