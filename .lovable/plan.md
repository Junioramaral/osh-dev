

## Sistema de Throttling e Confirmação de SLA

Este plano implementa um sistema completo de controle de notificações SLA com confirmação de ciência, escalonamento e indicador visual na interface.

---

### Visão Geral do Sistema

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE NOTIFICAÇÃO SLA                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐    SLA Vencido    ┌───────────────────┐                      │
│   │  Ticket  │ ─────────────────►│ 1ª Notificação    │                      │
│   │ (overdue)│                   │ (Time Otimizzo)   │                      │
│   └──────────┘                   └─────────┬─────────┘                      │
│                                            │                                │
│                                            ▼                                │
│                           ┌────────────────────────────────┐                │
│                           │   Email com Link de Ciência    │                │
│                           │   [Confirmar Ciência] button   │                │
│                           └───────────────┬────────────────┘                │
│                                           │                                 │
│                    ┌──────────────────────┴──────────────────────┐          │
│                    │                                             │          │
│                    ▼                                             ▼          │
│   ┌─────────────────────────────┐          ┌────────────────────────────┐   │
│   │   Analista clica no link   │          │ Analista NÃO clica         │   │
│   │   → Marca acknowledged_at   │          │ (passa 12 horas)           │   │
│   │   → Silencia por 12h       │          └─────────────┬──────────────┘   │
│   │   → Remove do sino         │                        │                  │
│   └─────────────────────────────┘                        ▼                  │
│                                           ┌────────────────────────────┐   │
│                                           │ 2ª Notificação             │   │
│                                           │ (Time + Super Admin)       │   │
│                                           │ notification_count = 2     │   │
│                                           └────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. Alterações no Banco de Dados

#### 1.1 Adicionar colunas na tabela `sla_notifications`

```sql
ALTER TABLE public.sla_notifications
ADD COLUMN acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN acknowledged_by UUID REFERENCES auth.users(id),
ADD COLUMN notification_level INTEGER DEFAULT 1,
ADD COLUMN acknowledgment_token UUID DEFAULT gen_random_uuid();
```

**Descrição das colunas:**
- `acknowledged_at`: Timestamp quando o analista confirmou ciência
- `acknowledged_by`: ID do usuário que confirmou
- `notification_level`: Nível da notificação (1 = primeira, 2 = escalada com Super Admin)
- `acknowledgment_token`: Token único para o link de confirmação

#### 1.2 Criar políticas RLS para atualização

```sql
-- Permitir que usuários Otimizzo/Super Admin atualizem acknowledged_at
CREATE POLICY "Otimizzo can acknowledge notifications"
ON public.sla_notifications FOR UPDATE
USING (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()))
WITH CHECK (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()));
```

---

### 2. Nova Edge Function: `acknowledge-sla`

Endpoint público para processar o clique no link de confirmação.

**Caminho:** `supabase/functions/acknowledge-sla/index.ts`

**Lógica:**
1. Recebe `notificationId` e `token` via query params
2. Valida o token contra o `acknowledgment_token` da notificação
3. Atualiza `acknowledged_at` e `acknowledged_by`
4. Redireciona para a página do ticket com mensagem de sucesso

**Fluxo:**
```text
GET /acknowledge-sla?id={notificationId}&token={acknowledgmentToken}
     │
     ▼
┌────────────────────────────────┐
│ Validar token                  │
│ Atualizar acknowledged_at      │
│ Redirect → /tickets/{ticketId} │
└────────────────────────────────┘
```

---

### 3. Atualizar Edge Function: `sla-monitor`

**Alterações principais:**

#### 3.1 Nova lógica de throttling (substituir verificação de 1 hora)

```typescript
// Verificar se há notificação recente NÃO confirmada nas últimas 12 horas
const { data: recentNotification } = await adminClient
  .from("sla_notifications")
  .select("id, acknowledged_at, notification_level")
  .eq("ticket_id", ticket.id)
  .eq("sla_type", slaType)
  .eq("alert_type", alertType)
  .order("sent_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (recentNotification) {
  const sentAt = new Date(recentNotification.sent_at);
  const hoursSinceSent = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);
  
  // Se confirmado nas últimas 12h, pular
  if (recentNotification.acknowledged_at) {
    const ackAt = new Date(recentNotification.acknowledged_at);
    const hoursSinceAck = (now.getTime() - ackAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceAck < 12) continue; // Silenciado
  }
  
  // Se não confirmado e passou 12h, escalar para Super Admin
  if (!recentNotification.acknowledged_at && hoursSinceSent >= 12) {
    alert.escalate = true;
    alert.notification_level = 2;
  }
}
```

#### 3.2 Adicionar link de confirmação no email

```html
<a href="${appUrl}/api/acknowledge-sla?id=${notificationId}&token=${ackToken}" 
   style="display: inline-block; background: #10b981; color: white; 
          padding: 14px 28px; text-decoration: none; border-radius: 6px; 
          font-weight: bold; margin-right: 10px;">
  ✅ Confirmar Ciência
</a>
```

#### 3.3 Incluir Super Admin em notificações escaladas

```typescript
if (hasEscalatedAlerts) {
  // Buscar emails de Super Admins
  const { data: superAdmins } = await adminClient
    .from("user_roles")
    .select("user_id")
    .eq("role", "super_admin");
  
  const superAdminIds = superAdmins?.map(sa => sa.user_id) || [];
  // Adicionar emails dos Super Admins aos destinatários
}
```

---

### 4. Interface: Ícone do Sino (Bell)

#### 4.1 Novo hook: `useOverdueSLAAlertsCount.ts`

```typescript
export const useOverdueSLAAlertsCount = () => {
  return useQuery({
    queryKey: ["overdue-sla-alerts-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("sla_notifications")
        .select("*", { count: "exact", head: true })
        .eq("alert_type", "overdue")
        .is("acknowledged_at", null);
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
};
```

#### 4.2 Novo componente: `SLAAlertBell.tsx`

**Localização:** `src/components/layout/SLAAlertBell.tsx`

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 
          bg-red-500 text-white text-xs rounded-full 
          flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    {/* Lista de tickets com SLA estourado aguardando confirmação */}
  </PopoverContent>
</Popover>
```

#### 4.3 Atualizar AppLayout.tsx

Adicionar o sino no header:
- **Desktop:** No topo da sidebar, ao lado do logo
- **Mobile:** Ao lado do botão de menu

---

### 5. Nova Página: Confirmação de Ciência

**Rota:** `/sla-acknowledge/:notificationId/:token`

**Fluxo:**
1. Valida token chamando a edge function
2. Mostra mensagem de confirmação
3. Redireciona para o ticket automaticamente

---

### 6. Arquivos a Criar/Modificar

| Tipo | Arquivo | Descrição |
|------|---------|-----------|
| Migração SQL | Nova migração | Adicionar colunas na tabela `sla_notifications` |
| Edge Function | `supabase/functions/acknowledge-sla/index.ts` | Processar confirmação de ciência |
| Edge Function | `supabase/functions/sla-monitor/index.ts` | Atualizar lógica de throttling |
| Hook | `src/hooks/useOverdueSLAAlertsCount.ts` | Contagem de alertas pendentes |
| Componente | `src/components/layout/SLAAlertBell.tsx` | Ícone do sino com dropdown |
| Página | `src/pages/SLAAcknowledge.tsx` | Página de confirmação |
| Layout | `src/components/layout/AppLayout.tsx` | Integrar o sino |
| Rotas | `src/App.tsx` | Adicionar rota `/sla-acknowledge` |
| Supabase Config | `supabase/config.toml` | Registrar nova edge function |

---

### 7. Regras de Negócio Resumidas

| Regra | Descrição |
|-------|-----------|
| **Primeira Notificação** | Enviada quando SLA vence (>75% ou overdue) |
| **Silenciamento** | Clicar em "Confirmar Ciência" silencia por 12 horas |
| **Escalonamento** | Se não confirmar em 12h, nova notificação inclui Super Admin |
| **Visibilidade** | Sino mostra apenas alertas `overdue` não confirmados |
| **Permissões** | Apenas usuários Otimizzo/Super Admin podem confirmar |

---

### 8. Considerações de Segurança

- O `acknowledgment_token` é um UUID único gerado para cada notificação
- A edge function `acknowledge-sla` valida o token antes de atualizar
- RLS garante que apenas usuários autorizados podem ver/confirmar alertas
- Links de confirmação expiram quando uma nova notificação é enviada

