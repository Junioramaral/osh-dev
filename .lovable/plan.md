
# Plano: Gerenciamento de Logs de Horas com Regras de Permissao

## Resumo

Implementar funcionalidades de edicao e exclusao de logs de horas com regras especificas de permissao baseadas em tempo e papeis de usuario, alem de exibir o total de horas registradas no ticket.

---

## Regras de Permissao

### Analistas (analyst_db, analyst_app, Otimizzo)
- Podem editar/excluir **apenas seus proprios logs**
- **Limite de tempo: 48 horas uteis** a partir do registro
  - Segunda a Quinta: 48 horas corridas
  - Sexta-feira: 24h de sexta + fim de semana + 24h de segunda = efetivamente ate segunda-feira no mesmo horario

### Super Admin e Tenant Admin
- **Acesso total** para editar/excluir qualquer log
- Sem restricao de tempo

### Viewers (Auditores)
- Apenas visualizacao, sem acoes de edicao/exclusao

---

## Logica de Calculo de 48h Uteis

```typescript
function canEditWithinBusinessHours(loggedAt: Date): boolean {
  const now = new Date();
  const logDate = new Date(loggedAt);
  
  // Dia da semana do log (0=domingo, 5=sexta, 6=sabado)
  const logDayOfWeek = logDate.getDay();
  
  // Se foi registrado na sexta-feira
  if (logDayOfWeek === 5) {
    // Adiciona 48h + fim de semana (48h do sabado/domingo)
    // Efetivamente: sexta 14:00 -> pode editar ate segunda 14:00
    const deadline = new Date(logDate);
    deadline.setDate(deadline.getDate() + 3); // +3 dias (seg)
    return now <= deadline;
  }
  
  // Para outros dias, simplesmente 48h corridas
  const deadline = new Date(logDate);
  deadline.setHours(deadline.getHours() + 48);
  return now <= deadline;
}
```

---

## Arquivos a Criar

### 1. `src/components/tickets/TimeLogEditDialog.tsx`

Dialog para edicao de log de horas existente.

**Campos:**
- Horas trabalhadas (pre-preenchido)
- Descricao do trabalho (pre-preenchido)

**Botoes:**
- Cancelar
- Salvar Alteracoes

---

### 2. `src/components/tickets/TimeLogDeleteDialog.tsx`

Dialog de confirmacao para exclusao.

**Conteudo:**
- Aviso de que a acao e irreversivel
- Exibir detalhes do log (horas, descricao, data)
- Botoes: Cancelar / Excluir

---

### 3. `src/lib/timeLogPermissions.ts`

Utilitario centralizado para calculo de permissoes.

```typescript
interface TimeLogPermissions {
  canEdit: boolean;
  canDelete: boolean;
  reason?: string; // "Prazo de 48h expirado" ou "Apenas o autor pode editar"
}

export function getTimeLogPermissions(
  log: TimeLog,
  userId: string,
  isSuperAdmin: boolean,
  isTenantAdmin: boolean,
  isViewer: boolean
): TimeLogPermissions;

export function isWithin48BusinessHours(loggedAt: Date): boolean;
```

---

## Arquivos a Modificar

### 1. `src/hooks/useTimeLogMutations.ts`

Adicionar mutations para editar e excluir:

```typescript
// NOVO: Editar log existente
const updateTimeLog = useMutation({
  mutationFn: async ({ logId, hours, description }) => {
    const { error } = await supabase
      .from("ticket_time_logs")
      .update({ hours, description })
      .eq("id", logId);
    if (error) throw error;
  },
  onSuccess: () => {
    toast.success("Horas atualizadas com sucesso!");
    queryClient.invalidateQueries({ queryKey: ["ticket-time-logs"] });
  }
});

// NOVO: Excluir log
const deleteTimeLog = useMutation({
  mutationFn: async ({ logId }) => {
    const { error } = await supabase
      .from("ticket_time_logs")
      .delete()
      .eq("id", logId);
    if (error) throw error;
  },
  onSuccess: () => {
    toast.success("Registro de horas excluído!");
    queryClient.invalidateQueries({ queryKey: ["ticket-time-logs"] });
  }
});
```

---

### 2. `src/components/tickets/TicketTimeline.tsx`

Modificar o componente `TimelineItem` para:
- Adicionar botoes de Editar/Excluir nos logs de horas (`time_logged`)
- Verificar permissoes antes de exibir botoes
- Integrar dialogs de edicao/exclusao

**Nova aparencia do item de log de horas:**

```text
┌────────────────────────────────────────────────────────────┐
│ ⏱ 2.5h registradas                              há 5 min  │
│   João Silva                                               │
│   ┌──────────────────────────────────────────────────────┐ │
│   │ Análise de logs e identificação do problema...       │ │
│   └──────────────────────────────────────────────────────┘ │
│                                         [✏️ Editar] [🗑️]   │  <-- NOVO
└────────────────────────────────────────────────────────────┘
```

---

### 3. `src/components/tickets/TicketSidebar.tsx`

Adicionar card de resumo com **Total de Horas**:

```text
┌─────────────────────────────────────┐
│  ⏱ Horas Trabalhadas               │
├─────────────────────────────────────┤
│                                     │
│  Total: 12.5 horas                  │
│  Registros: 5                       │
│                                     │
│  [Registrar Horas]                  │
└─────────────────────────────────────┘
```

**Hook necessario:** `useTicketTimeLogs(ticketId)` ja existe.

---

### 4. `src/contexts/AuthContext.tsx`

Adicionar helper `isTenantAdmin`:

```typescript
const isTenantAdmin = hasRole('tenant_admin');

// Exportar no provider
```

---

## Interface Visual - Acoes na Timeline

### Para analistas (dentro do prazo):
```text
○ 2.5h registradas                           há 2 horas
  João Silva (você)
  ┌────────────────────────────────────────┐
  │ Análise de performance...              │
  └────────────────────────────────────────┘
  [✏️ Editar] [🗑️ Excluir]
```

### Para analistas (fora do prazo):
```text
○ 2.5h registradas                           há 3 dias
  João Silva (você)
  ┌────────────────────────────────────────┐
  │ Análise de performance...              │
  └────────────────────────────────────────┘
  ⚠️ Prazo de edição expirado
```

### Para Super/Tenant Admin:
```text
○ 2.5h registradas                           há 3 dias
  João Silva
  ┌────────────────────────────────────────┐
  │ Análise de performance...              │
  └────────────────────────────────────────┘
  [✏️ Editar] [🗑️ Excluir]    ← Sempre disponível
```

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/lib/timeLogPermissions.ts` | Criar | Logica de permissoes centralizada |
| `src/components/tickets/TimeLogEditDialog.tsx` | Criar | Dialog de edicao |
| `src/components/tickets/TimeLogDeleteDialog.tsx` | Criar | Dialog de confirmacao de exclusao |
| `src/hooks/useTimeLogMutations.ts` | Modificar | Adicionar update e delete mutations |
| `src/components/tickets/TicketTimeline.tsx` | Modificar | Adicionar botoes e integrar dialogs |
| `src/components/tickets/TicketSidebar.tsx` | Modificar | Adicionar card de total de horas |
| `src/contexts/AuthContext.tsx` | Modificar | Adicionar isTenantAdmin |

---

## Detalhes Tecnicos

### Calculo de 48h uteis (considerando fim de semana)

```typescript
export function isWithin48BusinessHours(loggedAt: Date): boolean {
  const now = new Date();
  const logDate = new Date(loggedAt);
  const dayOfWeek = logDate.getDay();
  
  let deadline = new Date(logDate);
  
  // Sexta-feira (5): adiciona 3 dias (pula sabado/domingo)
  if (dayOfWeek === 5) {
    deadline.setDate(deadline.getDate() + 3);
  }
  // Sabado (6): adiciona 2 dias para chegar em segunda + 48h
  else if (dayOfWeek === 6) {
    deadline.setDate(deadline.getDate() + 2);
    deadline.setHours(deadline.getHours() + 48);
  }
  // Domingo (0): adiciona 1 dia para chegar em segunda + 48h
  else if (dayOfWeek === 0) {
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(deadline.getHours() + 48);
  }
  // Segunda a Quinta: 48h normais
  else {
    deadline.setHours(deadline.getHours() + 48);
  }
  
  return now <= deadline;
}
```

### Verificacao de permissoes completa

```typescript
export function getTimeLogPermissions(
  log: { analyst_id: string; logged_at: string },
  currentUserId: string,
  isSuperAdmin: boolean,
  isTenantAdmin: boolean,
  isViewer: boolean
): TimeLogPermissions {
  // Viewers nao podem editar/excluir nada
  if (isViewer) {
    return { canEdit: false, canDelete: false, reason: "Modo somente leitura" };
  }
  
  // Super Admin e Tenant Admin tem acesso total
  if (isSuperAdmin || isTenantAdmin) {
    return { canEdit: true, canDelete: true };
  }
  
  // Analistas so podem editar seus proprios logs
  if (log.analyst_id !== currentUserId) {
    return { canEdit: false, canDelete: false, reason: "Apenas o autor pode editar" };
  }
  
  // Verificar prazo de 48h uteis
  const withinDeadline = isWithin48BusinessHours(new Date(log.logged_at));
  if (!withinDeadline) {
    return { canEdit: false, canDelete: false, reason: "Prazo de 48h expirado" };
  }
  
  return { canEdit: true, canDelete: true };
}
```

---

## Resumo das Regras

| Role | Editar Proprio | Editar de Outros | Prazo |
|------|----------------|------------------|-------|
| Super Admin | Sim | Sim | Sem limite |
| Tenant Admin | Sim | Sim | Sem limite |
| Analyst (Otimizzo) | Sim | Nao | 48h uteis |
| Viewer | Nao | Nao | - |
| Cliente | Nao | Nao | - |
