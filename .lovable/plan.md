## Objetivo

Ao clicar em um cliente na página `/clients`, abrir uma **página dedicada** (rota própria) em vez do modal apertado. A página terá espaço total da tela para as abas — em especial a aba **Usuários**, hoje espremida dentro do modal `max-w-3xl`. A criação de novo cliente continua como modal (rápida e leve).

## Abordagem

### 1. Extrair o formulário do modal para um componente reutilizável
Criar `src/components/clients/ClientForm.tsx` contendo toda a lógica e UI hoje dentro do `ClientDialog` (schema zod, `useForm`, `useEffect` de preenchimento, `onSubmit`, as abas Informações Básicas / Usuários / Relatório / Contrato / SLAs / Projetos).

- Props: `mode: "create" | "edit"`, `client`, e callbacks `onSaved`/`onCancel`.
- O componente não conhece `Dialog` nem `página` — só renderiza o `<Form>` com as `<Tabs>`. Assim serve tanto ao modal de criação quanto à página de edição.

### 2. Nova página dedicada do cliente
Criar `src/pages/ClientDetail.tsx` na rota `/clients/:clientId`:
- Usa `AppLayout` (largura total da aplicação, com os overrides `-mx-6 px-2` já usados no projeto para telas amplas).
- Busca o cliente por `id` (mesma query de `clients`).
- Cabeçalho com botão "Voltar para Clientes" + nome do cliente.
- Renderiza `<ClientForm mode="edit" client={client} />` ocupando toda a largura.
- Controle de acesso igual ao da página de Clientes (super admin / viewer / tenant_admin / analistas).

Registrar a rota em `src/App.tsx`: `<Route path="/clients/:clientId" element={<ClientDetail />} />` (acima do catch-all).

### 3. Ajustar a listagem de Clientes
Em `src/pages/Clients.tsx`:
- O clique no card passa a **navegar** para `/clients/:id` (`useNavigate`) em vez de abrir o modal em modo edição.
- O `ClientDialog` permanece apenas para o botão "Novo Cliente" (modo create).

### 4. Responsividade das abas (principalmente Usuários)
Com o espaço da página inteira, ajustar para nunca espremer:
- `TabsList`: permitir quebra/scroll horizontal em telas pequenas (flex com `overflow-x-auto`) em vez de `grid-cols-6` fixo, que é o que aperta os rótulos.
- Aba **Usuários** (`TenantUsersManager`): tabela com `overflow-x-auto` e larguras mínimas por coluna para o telefone e e-mail não ficarem truncados; em telas estreitas, rolagem horizontal em vez de compressão.
- Demais abas (grids de SLA, contrato) passam a aproveitar a largura, mantendo `grid-cols-1` no mobile e 2+ colunas no desktop.

## Detalhes técnicos

- `ClientDialog.tsx` é reduzido a um wrapper `Dialog` que renderiza `<ClientForm mode="create" ... />` — evita duplicação de lógica.
- Após salvar na página de edição: toast de sucesso e permanecer na página (com dados atualizados via invalidação da query `clients`).
- A aba Projetos (`ClientProjectsTab`) e os componentes `TenantUsersManager` / `TenantUserReport` continuam recebendo `client.id` normalmente.
- Sem mudanças de banco de dados nem de lógica de negócio — apenas estrutura de UI e navegação.

## Resultado

- Lista de clientes → clique abre página inteira `/clients/:id` com as abas folgadas.
- Aba Usuários com tabela legível (telefone/e-mail sem aperto), com rolagem horizontal quando necessário.
- "Novo Cliente" continua como modal simples.
