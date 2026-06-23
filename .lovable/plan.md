## Objetivo

Quando um usuário da Otimizzo abrir um chamado para um cliente (ex.: ATP), o e-mail de resolução precisa ir para um contato do **cliente**, e não para o e-mail da Otimizzo. Para isso, adicionar um campo "Usuário Responsável" ao lado de "Cliente" no diálogo "Novo Registro", listando usuários da Otimizzo + usuários do cliente selecionado. O responsável vira o `contact_name`/`contact_email` do ticket, e o criador Otimizzo é incluído automaticamente em CC nas notificações.

## Escopo da mudança

Apenas frontend + ajuste no envio do e-mail de resolução (passar CC). Nada de schema novo, nada de RLS nova, nenhuma Edge Function nova (a `send-resolution-notification` já aceita `ccEmails`).

### 1. `src/components/tickets/NewTicketDialog.tsx`

- Adicionar campo opcional `responsible_user_id` (uuid) ao schema Zod. Obrigatório quando o tenant do criador é Otimizzo.
- Layout: transformar o bloco "Cliente" em um grid de 2 colunas (md:grid-cols-2):
  - Coluna 1: Cliente (já existe)
  - Coluna 2: **Usuário Responsável \***
- Visível apenas para usuários do tenant Otimizzo. Habilita só após escolher o Cliente. Ao trocar de cliente, limpar o valor.
- Buscar opções via uma query nova `["responsible-users", selectedClientId, otimizzoTenantId]`:
  - `profiles` (id, full_name, client_id) filtrando `client_id IN (otimizzoTenantId, selectedClientId)` ordenado por nome.
  - Para cada profile, buscar o e-mail via `get_user_email(_user_id)` (RPC SECURITY DEFINER já existente) — fazer em paralelo (`Promise.all`) e descartar quem não tiver e-mail.
  - Agrupar visualmente no `SelectContent` em duas seções: "Otimizzo" e "{Nome do Cliente}". Mostrar `full_name` + e-mail em texto secundário.
  - Pré-selecionar o próprio usuário criador (quando ele aparecer na lista) como default conveniente; o usuário pode trocar.
- No `createTicketMutation`, substituir:
  - `contact_name`: nome do responsável escolhido.
  - `contact_email`: e-mail do responsável escolhido.
  - Se nada selecionado (caso não-Otimizzo), manter comportamento atual (usuário logado vira contato).

### 2. `src/hooks/useTicketActions.ts` (resolveTicketWithReason)

- Antes de chamar a função `send-resolution-notification`, montar `ccEmails`:
  - Buscar o e-mail do criador do ticket via `ticket_history` (ação `created`) ou, mais simples, via novo campo já existente — verificar `tickets.created_by`/equivalente; se não houver, usar o primeiro registro de `ticket_history` com `action_type='created'` para descobrir `user_id` e então `get_user_email`.
  - Se o criador for usuário do tenant Otimizzo **e** for diferente do `contact_email`, incluí-lo em `ccEmails`.
  - Incluir também o e-mail do analista atual (`userId` que está resolvendo) se for Otimizzo e diferente do contato/criador.
- Passar `ccEmails` no `body` da chamada `fetch` para `send-resolution-notification` (a Edge Function já suporta).

### 3. UX / Validação

- Mensagem do Zod: "Selecione o usuário responsável pelo chamado" quando Otimizzo abre para cliente.
- Tooltip/help text curto abaixo do select: "O e-mail de resolução será enviado a este usuário; o criador Otimizzo entra em cópia (CC)."

## Fora de escopo

- Não mexer em `RFCFormSection` (RFC tem fluxo próprio).
- Não alterar template do e-mail.
- Não criar tabela nem coluna nova (`contact_user_id`) — vamos continuar usando `contact_email`/`contact_name` para minimizar mudança. Caso futuramente queiramos rastrear o profile escolhido, abrimos um item separado.
- Tickets já existentes (ex.: 00101014) não são corrigidos retroativamente; só novos chamados.

## Detalhes técnicos

- O RPC `get_user_email(uuid)` já é `SECURITY DEFINER` e está disponível no client.
- O grupo de opções no Radix Select pode ser feito com `<SelectGroup>` + `<SelectLabel>` ("Otimizzo", "{Cliente}").
- `otimizzoTenantId` constante: `'00000000-0000-0000-0000-000000000001'` (já usado no projeto).
