## Diagnóstico

Confirmei no banco: a Juliane existe (`profiles.id = d775aac4...`), mas `profiles.phone = NULL` **e** `client_contacts.phone = NULL`. Ou seja, o telefone nunca foi gravado em lugar nenhum — não é um problema de exibição.

### Causa raiz (Bug nº 1 — convite)

Na função `supabase/functions/invite-user/index.ts`:

1. `adminClient.auth.admin.createUser(...)` cria o registro em `auth.users`.
2. Isso dispara o trigger `handle_new_user`, que **já cria a linha em `profiles`** (com phone = NULL, pois o trigger não recebe telefone).
3. Logo em seguida, a edge function executa `adminClient.from("profiles").insert({ id, full_name, phone, client_id })`.
4. Esse `INSERT` falha com violação de PK (a linha já existe), o erro é **apenas logado** (`console.error`) e o fluxo continua. O telefone é descartado silenciosamente.

A inserção em `client_contacts` no fim da função até funcionaria, mas no caso da Juliane o contato também ficou sem telefone — provavelmente porque o convite foi feito sem o campo preenchido e o telefone foi adicionado depois na tela de edição. O que nos leva ao segundo bug.

### Causa raiz (Bug nº 2 — edição)

Em `src/hooks/useTenantUsers.ts` (`updateUserMutation`) o frontend faz `supabase.from("profiles").update({ phone })` direto, e **nada é replicado para `client_contacts`**. Mesmo quando o update do profile funciona (super_admin), o telefone do contato fica desatualizado. Além disso, para `tenant_admin` o RLS de `profiles` não permite `UPDATE` em outro usuário, então o update retorna 0 linhas sem erro — silencioso.

## Plano de correção

### 1. `supabase/functions/invite-user/index.ts`
- Trocar o `insert` em `profiles` por **`upsert` com `onConflict: 'id'`** (ou `update().eq('id', newUser.user.id)`), garantindo que `phone`, `full_name` e `client_id` sobrescrevam o que o trigger criou.
- Tratar erro como fatal (retornar 500) em vez de apenas logar, para não termos mais falhas silenciosas.

### 2. `src/hooks/useTenantUsers.ts` (`updateUserMutation`)
- Após o `update` em `profiles`, quando `phone` ou `full_name` mudarem, propagar o valor para `client_contacts` do mesmo `client_id`+`email` (mesmo padrão já existente no trigger `sync_profile_to_contacts`, que sincroniza `name`/`phone` mas só dispara quando o profile muda — confirmar se ele está ativo; se sim, basta garantir que o update do profile aconteça de fato).
- Verificar a contagem retornada pelo update; se `count === 0`, lançar erro "Sem permissão para atualizar este usuário" — assim paramos de mascarar falha de RLS para tenant_admin.

### 3. Correção pontual de dados da Juliane
- Após o deploy das correções, atualizar manualmente `profiles.phone` e `client_contacts.phone` da Juliane via UI de edição (que então funcionará), ou rodar um insert/update direto se você me passar o número.

## Verificação após implementação
1. Criar um usuário de teste pelo convite com telefone preenchido → conferir `profiles.phone` e `client_contacts.phone` populados.
2. Editar telefone de um usuário existente → conferir as duas tabelas atualizadas.
3. Tentar editar como tenant_admin um usuário fora do tenant → deve dar erro explícito.

Posso seguir com a implementação?
