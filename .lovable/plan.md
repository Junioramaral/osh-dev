## Objetivo

Levar a gestão de usuários (convidar, listar, editar, ativar/desativar, remover) e o relatório de usuários — hoje na página de detalhe do Tenant (`/admin/tenants/:tenantId`) — para dentro do dialog de edição do Cliente (`ClientDialog`), em novas abas posicionadas logo após "Informações Básicas". Em seguida, remover essas abas da página do Tenant.

O Tenant e o Cliente apontam para a mesma tabela (`clients`), então `client.id` corresponde ao `tenantId` usado pelos hooks atuais.

## O que será feito

### 1. Extrair a gestão de usuários para um componente reutilizável
Criar `src/components/tenants/TenantUsersManager.tsx` contendo TODA a lógica e UI hoje dentro da aba "Gerenciar Usuários" do `TenantDetail`:
- Tabela de usuários (nome, email, telefone, função, filas, status, ações)
- Dialog "Convidar Usuário"
- Dialog "Editar Usuário"
- AlertDialog de remoção permanente
- Uso do hook `useTenantUsers`, `RoleCheckboxGroup`, `QueueCheckboxGroup`, validações de domínio/telefone

Props: `tenantId`, `tenantDomain`, `maxUsers`. Assim a mesma lógica funciona tanto no dialog do cliente quanto em qualquer outro lugar.

### 2. Adicionar as abas no `ClientDialog`
- Em `src/components/clients/ClientDialog.tsx`, adicionar duas novas abas na `TabsList`, posicionadas imediatamente após "Informações Básicas" e antes de "Contrato":
  - **Usuários** → renderiza `<TenantUsersManager tenantId={client.id} tenantDomain={client.domain} maxUsers={client.max_users} />`
  - **Relatório** → renderiza `<TenantUserReport tenantId={client.id} tenantName={client.name} />`
- Essas abas só aparecem em `mode === "edit"` (precisam de um `client.id` existente). No modo "create" a `TabsList` mantém apenas as abas atuais.
- Ajustar o número de colunas da `TabsList` (`grid-cols-*`) conforme as abas exibidas.

### 3. Limpar a página do Tenant
- Em `src/pages/TenantDetail.tsx`, remover o bloco `<Tabs>` com "Gerenciar Usuários" e "Relatório" (linhas ~661–875), além dos dialogs/alertdialogs e do estado/handlers que passam a viver dentro de `TenantUsersManager` (convite, edição de usuário, remoção, `useTenantUsers`, imports não usados).
- Manter o restante da página (cabeçalho, card de informações, e o dialog "Editar Tenant").

## Detalhes técnicos

- `TenantUserReport` já recebe `tenantId`/`tenantName`, então é reaproveitado direto.
- O `client` em `Clients.tsx` é uma linha de `clients`, contendo `id`, `domain`, `max_users`, `name` — tudo que o novo componente precisa.
- Como o `ClientDialog` em edição já mantém o dialog aberto após salvar, a gestão de usuários conviverá bem com o formulário do cliente.
- Atenção a conflitos de componentes `Dialog` aninhados: o `ClientDialog` é um `Dialog`; os dialogs de convite/edição/remoção dentro de `TenantUsersManager` são dialogs filhos — funcionam normalmente como overlays empilhados.
- Revisar imports órfãos em `TenantDetail.tsx` após a remoção (ex.: `useTenantUsers`, `RoleCheckboxGroup`, `QueueCheckboxGroup`, `Table*`, ícones).

## Resultado

- Página do Tenant: apenas informações e edição do tenant, sem abas de usuários/relatório.
- Dialog de edição do Cliente: abas na ordem **Informações Básicas → Usuários → Relatório → Contrato → SLAs → Projetos**, com a gestão completa de usuários e o relatório embutidos.
