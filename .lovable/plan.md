## Objetivo

Mostrar nas telas de RFC quem abriu a RFC (nome + email do usuário que criou o ticket), além das informações já existentes (Cliente, Contato, Informações Técnicas).

## Fonte do dado

A tabela `tickets` não tem coluna `created_by`. A informação de quem abriu já é registrada em `ticket_history` pelo trigger `log_ticket_creation` (`action_type = 'created'`, `user_id = auth.uid()`).

Para evitar uma migration e manter retrocompatibilidade com tickets antigos, vamos buscar o autor via `ticket_history`:

```sql
SELECT user_id FROM ticket_history
WHERE ticket_id = :id AND action_type = 'created'
ORDER BY created_at ASC LIMIT 1
```

E então resolver `full_name` em `profiles` e `email` via RPC `get_user_email`.

## 1. Hook — `src/hooks/useTicketDetail.ts`

Após carregar o ticket, fazer um lookup adicional:

- Buscar o primeiro registro `ticket_history` com `action_type='created'` para o ticket.
- Se houver `user_id`: buscar `profiles.full_name` e chamar `get_user_email`.
- Anexar ao retorno: `created_by_name`, `created_by_email`.

Mantém o padrão já usado para `analyst_email`.

## 2. Query da aprovação — `src/pages/RFCApproval.tsx`

Na query `rfc-pending-approval-list`, após receber a lista, fazer um segundo fetch agregado em `ticket_history` filtrando `action_type='created'` e `ticket_id IN (...)`, juntando com `profiles` para obter o nome. Fazer um único `rpc('get_user_email')` por ticket (ou usar uma função batch nova se necessário — começar simples, um por ticket, já que a lista é pequena).

Anexar `created_by_name` e `created_by_email` em cada RFC retornada.

## 3. Componente `RFCContextCards.tsx`

Adicionar um quarto card "Solicitante" (ou incluir como bloco no card "Contato"). Para não quebrar o grid de 3 colunas, vamos mudar para `md:grid-cols-2 lg:grid-cols-4` e adicionar:

```text
[ Cliente ] [ Solicitante ] [ Contato ] [ Informações Técnicas ]
              Nome
              Email
```

Ícone: `UserPlus` do lucide-react. Oculta o card se `created_by_name` e `created_by_email` estiverem ausentes (tickets antigos sem histórico).

## 4. Onde usar

Já está plugado em:
- `src/pages/RFCApproval.tsx`
- `src/pages/TicketDetail.tsx` (aba RFC)
- `src/pages/ClientRFCPortal.tsx`

Para o portal do cliente, a query também precisa incluir `created_by_name`/`created_by_email` (mesma lógica do hook: lookup em `ticket_history` + `profiles` + `get_user_email`).

## 5. Detalhes técnicos

- Sem migration de schema.
- RLS: `ticket_history` já permite SELECT para usuários com acesso ao ticket; `profiles` tem policy "Client can view ticket analysts" — pode não cobrir o caso de o solicitante ser do próprio cliente. Verificaremos: a policy "Viewers can view tenant profiles" e "Otimizzo view work-related profiles" já cobrem cenários relevantes; se o nome ficar vazio, faremos fallback para o email.
- `get_user_email` é SECURITY DEFINER, então funciona para qualquer usuário autenticado.

## Arquivos editados

- `src/hooks/useTicketDetail.ts` — adicionar lookup do criador.
- `src/pages/RFCApproval.tsx` — anexar criador na lista.
- `src/pages/ClientRFCPortal.tsx` — anexar criador.
- `src/components/tickets/RFCContextCards.tsx` — novo card "Solicitante".
