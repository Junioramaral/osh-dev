
# Plano: Migrar Domínio de Email para resend.otimizzo.com

## Contexto

O usuário criou o subdomínio `resend.otimizzo.com` na Hostinger com registros MX configurados para o Resend. Agora precisamos atualizar todas as Edge Functions para usar este novo subdomínio.

## Mudanças Necessárias

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `receive-email-reply/index.ts` | Atualizar lista de emails do sistema e padrão de extração |
| `send-comment-notification/index.ts` | Alterar `from` e `replyTo` |
| `send-resolution-notification/index.ts` | Alterar `from`, `replyTo` e headers |
| `send-analyst-notification/index.ts` | Alterar `from` e `replyTo` |
| `sla-monitor/index.ts` | Alterar `from` |
| `send-monthly-report/index.ts` | Alterar `from` |
| `invite-user/index.ts` | Alterar `from` |
| `unlock-inactive-tickets/index.ts` | Alterar `from` e `to` |

---

## Detalhamento das Alterações

### 1. receive-email-reply/index.ts

**Lista de emails do sistema (linha 161-168):**
```typescript
// ANTES:
const SYSTEM_EMAILS = [
  "noreply@otimizzo.com",
  "suporte@otimizzo.com",
  ...
];

// DEPOIS:
const SYSTEM_EMAILS = [
  "noreply@resend.otimizzo.com",
  "suporte@resend.otimizzo.com",
  "noreply@otimizzo.com",  // manter para compatibilidade
  "suporte@otimizzo.com",  // manter para compatibilidade
  "mailer-daemon@",
  "postmaster@",
  "no-reply@",
  "noreply@"
];
```

**Função extractTicketNumberFromTo (linha 114-126):**
```typescript
// ANTES:
const match = addr.match(/ticket-(\d+)@/i);

// DEPOIS (aceita ambos domínios):
const match = addr.match(/ticket-(\d+)@(?:resend\.)?otimizzo\.com/i);
```

---

### 2. send-comment-notification/index.ts

**Envio de email (linha 149-159):**
```typescript
// ANTES:
from: "Otimizzo Suporte <noreply@otimizzo.com>",
replyTo: `ticket-${ticketNumber}@otimizzo.com`,
...
'In-Reply-To': `<ticket-${ticketNumber}@otimizzo.com>`,
'References': `<ticket-${ticketNumber}@otimizzo.com>`,

// DEPOIS:
from: "Otimizzo Suporte <noreply@resend.otimizzo.com>",
replyTo: `ticket-${ticketNumber}@resend.otimizzo.com`,
...
'In-Reply-To': `<ticket-${ticketNumber}@resend.otimizzo.com>`,
'References': `<ticket-${ticketNumber}@resend.otimizzo.com>`,
```

---

### 3. send-resolution-notification/index.ts

**Envio de email (linha 131-141):**
```typescript
// ANTES:
from: "Otimizzo Suporte <noreply@otimizzo.com>",
replyTo: `ticket-${ticketNumber}@otimizzo.com`,
...
'In-Reply-To': `<ticket-${ticketNumber}@otimizzo.com>`,
'References': `<ticket-${ticketNumber}@otimizzo.com>`,

// DEPOIS:
from: "Otimizzo Suporte <noreply@resend.otimizzo.com>",
replyTo: `ticket-${ticketNumber}@resend.otimizzo.com`,
...
'In-Reply-To': `<ticket-${ticketNumber}@resend.otimizzo.com>`,
'References': `<ticket-${ticketNumber}@resend.otimizzo.com>`,
```

---

### 4. send-analyst-notification/index.ts

**Envio de email (linha 117-119):**
```typescript
// ANTES:
from: "Otimizzo Suporte <noreply@otimizzo.com>",
replyTo: "suporte@otimizzo.com",

// DEPOIS:
from: "Otimizzo Suporte <noreply@resend.otimizzo.com>",
replyTo: "suporte@resend.otimizzo.com",
```

---

### 5. sla-monitor/index.ts

**Envio de email (linha 447-449):**
```typescript
// ANTES:
from: "Otimizzo SLA Monitor <noreply@otimizzo.com>",

// DEPOIS:
from: "Otimizzo SLA Monitor <noreply@resend.otimizzo.com>",
```

---

### 6. send-monthly-report/index.ts

**Envio de email (linha 434-435):**
```typescript
// ANTES:
from: "Otimizzo Suporte <noreply@otimizzo.com>",

// DEPOIS:
from: "Otimizzo Suporte <noreply@resend.otimizzo.com>",
```

---

### 7. invite-user/index.ts

**Envio de email (linha 367-368):**
```typescript
// ANTES:
from: "Otimizzo Service Hub <noreply@otimizzo.com>",

// DEPOIS:
from: "Otimizzo Service Hub <noreply@resend.otimizzo.com>",
```

---

### 8. unlock-inactive-tickets/index.ts

**Envio de email (linha 223-225):**
```typescript
// ANTES:
from: "Sistema Otimizzo <noreply@otimizzo.com>",
to: ["suporte@otimizzo.com"],

// DEPOIS:
from: "Sistema Otimizzo <noreply@resend.otimizzo.com>",
to: ["suporte@resend.otimizzo.com"],
```

---

## Fluxo Após as Alterações

```text
┌─────────────────────────────────────────────────────────────┐
│ Sistema envia email para cliente                            │
│ From: noreply@resend.otimizzo.com                           │
│ Reply-To: ticket-00000006@resend.otimizzo.com               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Cliente clica "Responder"                                   │
│ Email vai para: ticket-00000006@resend.otimizzo.com         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Resend Receiving (subdomínio resend.otimizzo.com)           │
│ Aciona webhook → receive-email-reply                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ receive-email-reply processa:                               │
│ 1. Ignora se from = noreply@resend.otimizzo.com (sistema)   │
│ 2. Extrai ticket de ticket-XXXXX@resend.otimizzo.com        │
│ 3. Insere comentário no banco                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Checklist de Configuração no Resend

Certifique-se de que no Resend Dashboard:

1. **Domain**: `resend.otimizzo.com` está verificado
2. **Sending**: Habilitado para o subdomínio
3. **Receiving**: Habilitado com endpoint de webhook apontando para:
   - `https://ukrgzsntvddzwtmccwbf.supabase.co/functions/v1/receive-email-reply`
4. **Catch-all**: Configurado para receber `*@resend.otimizzo.com` (ou pelo menos `ticket-*@resend.otimizzo.com`)

---

## Resultado Esperado

- Todos os emails enviados terão `@resend.otimizzo.com` como remetente
- Clientes podem responder e o email chegará via webhook
- Não haverá mais loops ou bounces relacionados ao domínio
- O sistema continuará ignorando emails do próprio sistema (agora com o novo domínio)
