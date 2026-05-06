## Objetivo

Adicionar um campo "Contato" no formulário de criação de RFC que aparece após a seleção do cliente, listando os usuários cadastrados desse cliente.

## Comportamento

1. Usuário Otimizzo seleciona o **Cliente** (campo já existente).
2. Após a seleção, aparece o campo **Contato \***, um dropdown com a lista de usuários ativos vinculados àquele cliente (consultados em `profiles` filtrando por `client_id` e `is_active = true`).
3. Cada item mostra `full_name` e o e-mail do usuário (obtido via edge function `manage-user` action `list_users`, que já é o padrão do projeto — ver `useTenantUsers.ts`).
4. Ao escolher um contato, os campos `contact_name` e `contact_email` do ticket passam a ser preenchidos com os dados do contato selecionado (em vez do usuário logado).
5. Se nenhum cliente foi selecionado ainda, o dropdown fica oculto. Se o cliente não tiver usuários, mostra mensagem "Nenhum contato cadastrado para este cliente".
6. Para usuários não-Otimizzo (cliente criando sua própria RFC), mantém o comportamento atual (usa o próprio usuário logado como contato) — não há mudança.
7. Trocar o cliente limpa o contato selecionado.

## Validação

- Campo Contato passa a ser obrigatório quando o usuário é Otimizzo.
- `isValid` agora também checa `selectedContactId`.

## Mudanças técnicas

**Arquivo único: `src/components/tickets/RFCFormSection.tsx`**

- Novo estado: `const [contactId, setContactId] = useState<string>("")`.
- Nova query `useQuery(["rfc-client-contacts", effectiveClientId])` habilitada quando `isOtimizzoUser && effectiveClientId`:
  - Busca `profiles` por `client_id = effectiveClientId, is_active = true`.
  - Em paralelo, invoca `supabase.functions.invoke("manage-user", { body: { action: "list_users" }})` para mapear `id -> email` (mesmo padrão de `useTenantUsers.ts`).
  - Retorna array `{ id, full_name, email }`.
- Adicionar novo `<Select>` "Contato *" entre o campo Cliente e o Segmento, renderizado apenas quando `isOtimizzoUser && clientId`.
- `useEffect` que zera `contactId` quando `clientId` muda.
- No `handleSubmit`, ao montar `ticketData`:
  - Se `isOtimizzoUser` e contato selecionado → usar `contact_name = contact.full_name` e `contact_email = contact.email`.
  - Caso contrário, manter fallback atual (`profile.full_name` / `user.email`).
- Atualizar `isValid` para exigir `contactId` quando `isOtimizzoUser`.

Nenhuma mudança em banco de dados, edge functions ou outros componentes.
