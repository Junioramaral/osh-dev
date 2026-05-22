## Diagnóstico

O print está correto: no banco, a Juliane está com telefone vazio em duas tabelas:

- `profiles.phone = NULL`
- `client_contacts.phone = NULL`

Ou seja, a listagem não está escondendo o telefone; o telefone não foi persistido para esse usuário.

Também encontrei que o fluxo de criação do tenant chama a Edge Function `invite-user` passando `phone`, mas o usuário da Juliane foi criado antes/ao redor da correção anterior, e o registro atual ficou sem telefone. Como não há log recente da Edge Function para esse email, a causa mais provável é que o telefone não chegou gravado na função ou foi perdido no fluxo antigo antes da correção.

## Plano de correção

1. Corrigir o fluxo de convite para ficar mais robusto
   - Garantir que `invite-user` grave o telefone no `profiles` via `upsert`.
   - Se o contato já existir em `client_contacts`, atualizar também `name`, `phone`, `role` e `updated_at`, em vez de apenas ignorar o contato existente.
   - Incluir o telefone em `user_metadata` na criação do auth user para o trigger `handle_new_user` também ter essa informação disponível.

2. Corrigir o trigger de novo usuário
   - Atualizar `handle_new_user()` para gravar `phone` a partir de `raw_user_meta_data->>'phone'` quando existir.
   - Isso evita perda do telefone quando o perfil é criado automaticamente pelo trigger antes da Edge Function completar.

3. Corrigir a Juliane no dado atual
   - Atualizar `profiles.phone` e `client_contacts.phone` para `juliane@atppoa.com.br`, usando o telefone correto que você me passar.
   - Após isso, a coluna “Telefone” deve aparecer na tela do tenant ATPPOA.

## Preciso de uma informação

Me informe o telefone correto da Juliane para eu aplicar a correção no registro atual.