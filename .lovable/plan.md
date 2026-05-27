## Mudar prioridade padrão de novos tickets para P4

Alterar o default do formulário "Novo Ticket" de `P3` para `P4`. O usuário continua podendo escolher qualquer prioridade no Select.

### Arquivo

`src/components/tickets/NewTicketDialog.tsx` — duas ocorrências:
- linha 109: `defaultValues` do `useForm` → `priority: "P4"`.
- linha 238: bloco de `form.reset(...)` ao fechar/abrir → `priority: "P4"`.

### Fora do escopo

- `RFCFormSection.tsx` mantém `P3` (RFC não é ticket de suporte e está fora do fluxo de SLA).
- Sem mudanças em backend, RLS, ou tickets já existentes (apenas o default no momento da criação).
- Sem mudanças em filtros, relatórios ou listagens.
