
# Plano: Ajustar Tipos de Ticket

## Resumo da Análise

Ao analisar o sistema, identifiquei todos os pontos onde o tipo de ticket é definido ou exibido:

### Pontos de Alteração Identificados

| Local | Arquivo | Tipo de Alteração |
|-------|---------|-------------------|
| Banco de Dados | Migration SQL | Adicionar "problema" e "service_request" ao ENUM `ticket_type` |
| Types TypeScript | `src/integrations/supabase/types.ts` | Atualizar tipagem (será regenerado automaticamente após migration) |
| Formulário de Criação | `src/components/tickets/NewTicketDialog.tsx` | Atualizar schema Zod + opções do Select |
| Exibição de Detalhes | `src/components/tickets/TicketDetails.tsx` | Usar função de formatação para labels legíveis |
| Utilitários | `src/lib/ticketUtils.tsx` | Adicionar função `getTicketTypeLabel()` |

---

## Alterações Detalhadas

### 1. Migration SQL (Novo arquivo)

Criar migration para alterar o ENUM `ticket_type`:

```sql
-- Adicionar novos valores ao ENUM ticket_type
ALTER TYPE public.ticket_type ADD VALUE IF NOT EXISTS 'problema';
ALTER TYPE public.ticket_type ADD VALUE IF NOT EXISTS 'service_request';
```

Os valores atuais são: `incidente`, `duvida`, `solicitacao`

Os novos valores serão:
- `incidente` - Incidente (mantido)
- `duvida` - Dúvida (mantido)
- `problema` - Problema (novo)
- `service_request` - Service Request (substitui "solicitacao" como novo padrão, mas mantém o antigo para compatibilidade)

### 2. `src/lib/ticketUtils.tsx`

Adicionar função para formatação de labels:

```typescript
export const getTicketTypeLabel = (type: string): string => {
  switch (type) {
    case 'incidente':
      return 'Incidente';
    case 'duvida':
      return 'Dúvida';
    case 'problema':
      return 'Problema';
    case 'service_request':
      return 'Service Request';
    case 'solicitacao':
      return 'Service Request'; // Manter compatibilidade com dados antigos
    default:
      return type;
  }
};
```

### 3. `src/components/tickets/NewTicketDialog.tsx`

**Schema Zod (linha 38):**
```typescript
// De:
ticket_type: z.enum(["incidente", "duvida", "solicitacao"]),

// Para:
ticket_type: z.enum(["incidente", "duvida", "problema", "service_request"]),
```

**Select Options (linhas 700-703):**
```typescript
// De:
<SelectItem value="incidente">Incidente</SelectItem>
<SelectItem value="duvida">Dúvida</SelectItem>
<SelectItem value="solicitacao">Solicitação</SelectItem>

// Para:
<SelectItem value="incidente">Incidente</SelectItem>
<SelectItem value="problema">Problema</SelectItem>
<SelectItem value="duvida">Dúvida</SelectItem>
<SelectItem value="service_request">Service Request</SelectItem>
```

### 4. `src/components/tickets/TicketDetails.tsx`

Usar a função de formatação para exibir o label correto:

```typescript
// Importar
import { getTicketTypeLabel } from "@/lib/ticketUtils";

// Linha 79 - De:
<InfoRow label="Tipo" value={ticket.ticket_type} />

// Para:
<InfoRow label="Tipo" value={getTicketTypeLabel(ticket.ticket_type)} />
```

Também renomear o título do card de "Detalhes do Incidente" para "Detalhes do Ticket":

```typescript
// Linha 74 - De:
Detalhes do Incidente

// Para:
Detalhes do Ticket
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/XXXXXXXX_add_ticket_types.sql` | Criar nova migration |
| `src/lib/ticketUtils.tsx` | Adicionar função `getTicketTypeLabel()` |
| `src/components/tickets/NewTicketDialog.tsx` | Atualizar schema e opções do Select |
| `src/components/tickets/TicketDetails.tsx` | Usar formatação e renomear título do card |

---

## Notas Técnicas

1. **Compatibilidade**: O valor `solicitacao` será mantido no banco para não quebrar tickets existentes. A função `getTicketTypeLabel()` traduz tanto `solicitacao` quanto `service_request` para "Service Request"

2. **Ordem no Select**: Os tipos serão ordenados logicamente: Incidente, Problema, Dúvida, Service Request (do mais urgente para menos urgente)

3. **Regeneração de Types**: Após a migration, o arquivo `types.ts` será automaticamente regenerado pelo Supabase, incluindo os novos valores do ENUM
