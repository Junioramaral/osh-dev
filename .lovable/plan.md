## Objetivo
Remover a obrigatoriedade do campo **"Passos para Reprodução"** no formulário de abertura de ticket.

## Escopo
- Arquivo único: `src/components/tickets/NewTicketDialog.tsx`
- Alteração no schema Zod do formulário (linha ~50)

## Implementação
No `ticketSchema`, modificar a validação de:
```
reproduction_steps: z.string().min(1, "Passos para reprodução são obrigatórios")
```
Para:
```
reproduction_steps: z.string().optional()
```

Isso remove a obrigatoriedade tanto do schema quanto da mensagem de erro associada, sem afetar nenhum outro campo ou comportamento do formulário.