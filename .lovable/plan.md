

# Problema: Analista sem equipe atribuída não consegue criar tickets

## Diagnóstico

O erro ocorre porque a restrição implementada anteriormente exige que analistas Otimizzo tenham um `team_id` no seu perfil (`profiles.team_id`). Porém, **não existe nenhuma tela no sistema para atribuir um time a um usuário/analista**. O campo `profiles.team_id` só pode ser alterado diretamente no banco de dados.

## Solução

Adicionar um campo de seleção de **Time** na tela de gerenciamento de usuários do tenant (`TenantDetail.tsx`), visível apenas para usuários do tenant Otimizzo que possuem role de analista. Isso permitirá que o super_admin atribua um time a cada analista.

## Mudanças

### 1. `src/pages/TenantDetail.tsx`

- Na tabela de usuários, adicionar uma coluna **"Time"** que mostra o time atribuído ao analista (ou "—" se nenhum)
- No dialog de edição de usuário (já existente para nome/email/telefone), adicionar um campo **Select de Time** que aparece quando o usuário tem role de analista (`analyst_db` ou `analyst_app`)
- Ao salvar, atualizar o `profiles.team_id` junto com os outros campos

### 2. `src/hooks/useTenantUsers.ts`

- Incluir `team_id` e o join com `teams(name)` na query de usuários do tenant, para exibir o nome do time na listagem

### Fluxo do admin

1. Admin acessa **Admin Tenants → Otimizzo → Gerenciar Usuários**
2. Clica em editar um analista
3. Seleciona o **Time** no novo campo (ex: "Time Oracle", "Time PostgreSQL")
4. Salva — o `profiles.team_id` é atualizado
5. Analista agora pode criar tickets filtrados pelo segmento da sua equipe

