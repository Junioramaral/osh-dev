

# Plano: Lançamento Manual de Horas nos Tickets

## Resumo

Implementar funcionalidade para que analistas possam registrar manualmente as horas trabalhadas em cada ticket, com botão de acesso rápido na tela de detalhes e exibição na timeline.

## Estrutura de Dados Existente

A tabela `ticket_time_logs` já existe e está pronta para uso:

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| id | uuid | Sim | Chave primária |
| ticket_id | uuid | Sim | FK para tickets |
| analyst_id | uuid | Sim | FK para profiles |
| hours | numeric | Sim | Horas trabalhadas |
| description | text | Não | Descrição do trabalho |
| logged_at | timestamp | Não | Data/hora do registro (default: now) |

As RLS policies já permitem que Otimizzo e Super admins façam insert/update/delete.

---

## Arquivos a Criar

### 1. `src/components/tickets/TimeLogDialog.tsx`

Dialog modal para registrar horas trabalhadas.

**Campos do formulário:**
- **Horas trabalhadas** (obrigatório): Input numérico com step 0.5 (permite 0.5, 1, 1.5, etc.)
- **Descrição** (opcional): Textarea para descrever o trabalho realizado

**Comportamento:**
- Validação: mínimo 0.5h, máximo 24h
- Ao salvar: insere na tabela `ticket_time_logs` com o `analyst_id` do usuário logado
- Após sucesso: invalida queries para atualizar a Timeline

---

### 2. `src/hooks/useTimeLogMutations.ts`

Hook com mutations para gerenciar logs de horas.

**Mutations:**
```typescript
// Adicionar novo log
addTimeLog.mutate({
  ticketId: string,
  hours: number,
  description?: string
})

// Remover log (futuro)
deleteTimeLog.mutate({ logId: string })
```

---

## Arquivos a Modificar

### 1. `src/components/tickets/TicketSidebar.tsx`

Adicionar botão "Registrar Horas" no card de Ações do Ticket.

**Localização:** Abaixo do botão "Resolver Ticket"

**Design:**
```text
┌─────────────────────────────────────┐
│  Ações do Ticket                    │
├─────────────────────────────────────┤
│  Status Atual: [Em Atendimento]     │
│                                     │
│  Alterar Status: [Dropdown]         │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ✓ Resolver Ticket               ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ⏱ Registrar Horas               ││  <-- NOVO
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Visibilidade:**
- Apenas para usuários Otimizzo/SuperAdmin (não clientes)
- Não exibir para Viewers (modo leitura)
- Visível mesmo em tickets resolvidos (pode registrar horas retroativas)

---

### 2. `src/components/tickets/TicketTimeline.tsx` (já preparado)

A Timeline já está configurada para exibir logs de horas:
```typescript
case 'time_logged': return `${event.hours}h registradas`;
```

Nenhuma modificação necessária - os logs aparecerão automaticamente.

---

## Interface do Dialog

```text
┌─────────────────────────────────────────────────┐
│  ⏱ Registrar Horas Trabalhadas         [X]     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Ticket #00000001 - Título do Ticket            │
│  ──────────────────────────────────────────     │
│                                                 │
│  Horas Trabalhadas *                            │
│  ┌─────────────────────────────────────────┐    │
│  │ 2.5                                     │    │
│  └─────────────────────────────────────────┘    │
│  Mínimo: 0.5h | Máximo: 24h                     │
│                                                 │
│  Descrição do Trabalho                          │
│  ┌─────────────────────────────────────────┐    │
│  │ Análise de logs e identificação do      │    │
│  │ problema de performance na query...     │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
├─────────────────────────────────────────────────┤
│                    [Cancelar]  [Registrar Horas]│
└─────────────────────────────────────────────────┘
```

---

## Fluxo de Uso

```text
1. Analista abre ticket
        ↓
2. Clica em "Registrar Horas" na sidebar
        ↓
3. Dialog abre com formulário
        ↓
4. Preenche horas e descrição
        ↓
5. Clica "Registrar Horas"
        ↓
6. Sistema salva em ticket_time_logs
        ↓
7. Toast de sucesso
        ↓
8. Timeline atualiza mostrando o novo registro
```

---

## Arquivos Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/tickets/TimeLogDialog.tsx` | Criar | Dialog com formulário de lançamento |
| `src/hooks/useTimeLogMutations.ts` | Criar | Hook com mutation para inserir logs |
| `src/components/tickets/TicketSidebar.tsx` | Modificar | Adicionar botão e integrar dialog |

---

## Detalhes Tecnicos

### Mutation para inserir log

```typescript
const addTimeLog = useMutation({
  mutationFn: async ({ ticketId, hours, description }) => {
    const { error } = await supabase
      .from('ticket_time_logs')
      .insert({
        ticket_id: ticketId,
        analyst_id: profile.id,
        hours,
        description: description || null,
      });
    if (error) throw error;
  },
  onSuccess: () => {
    toast.success("Horas registradas com sucesso!");
    queryClient.invalidateQueries({ queryKey: ['ticket-time-logs'] });
    queryClient.invalidateQueries({ queryKey: ['ticket-history'] });
  }
});
```

### Input de horas com step

```typescript
<Input
  type="number"
  min={0.5}
  max={24}
  step={0.5}
  value={hours}
  onChange={(e) => setHours(parseFloat(e.target.value))}
/>
```

### Permissões verificadas via AuthContext

```typescript
const { isOtimizzo, isSuperAdmin, isViewer } = useAuth();
const canLogTime = (isOtimizzo || isSuperAdmin) && !isViewer;
```

---

## Exibição na Timeline

Após implementação, a Timeline mostrará:

```text
Timeline
─────────────────────────────────────────────
○ 2.5h registradas                 há 5 min
  João Silva
  ┌────────────────────────────────────────┐
  │ Análise de logs e identificação do     │
  │ problema de performance na query...    │
  └────────────────────────────────────────┘

○ Status alterado de "novo" para     há 1h
  "em_atendimento"
  Sistema

○ Ticket criado                   26/11/2025
  Sistema
```

