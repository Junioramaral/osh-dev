## Objetivo

Adicionar campos técnicos na criação da RFC e mostrar um resumo (Cliente, Contato, Informações Técnicas) acima do título da RFC nas telas de RFC aberta / Aprovação.

## 1. Criação de RFC — `src/components/tickets/RFCFormSection.tsx`

Após o segmento, incluir um card "Informações Técnicas" com campos em cascata, espelhando a lógica já usada em `NewTicketDialog`:

- **Segmento DB**: `db_engine`, `db_environment`, `db_machine_id`, `db_instance_id`
- **Segmento APP**: `app_product_id`, `app_environment`, `app_machine_id`, `app_instance_id`, `app_module`, `app_version`

Os queries serão idênticas às do `NewTicketDialog` (database_instances, application_instances, application_products, machines do cliente selecionado, com filtros encadeados). Os valores serão persistidos diretamente nas colunas correspondentes da tabela `tickets` no `handleSubmit`.

Validação leve: pelo menos engine+instância (DB) ou produto+instância (APP). Não bloquearemos rascunhos sem esses campos preenchidos para manter flexibilidade — apenas avisaremos no "Solicitar Aprovação".

## 2. Cards de contexto — Aprovação de RFC e Detalhe da RFC

Criar um componente reutilizável `src/components/tickets/RFCContextCards.tsx` que recebe o `ticket` e renderiza 3 cards lado a lado (grid responsivo):

```text
[ Cliente ]      [ Contato ]      [ Informações Técnicas ]
 Nome cliente     Nome contato      Segmento + Engine/Produto
 Domínio          Email contato     Ambiente / Máquina / Instância / Versão
```

Onde usar:

- **`src/pages/RFCApproval.tsx`**: inserir `<RFCContextCards ticket={selectedRfc}/>` logo após o header `#NNNN + segment + Aguardando Aprovação + título` e antes do `<Separator />` que precede a lista de passos. Ajustar a query `rfc-pending-approval-list` para já trazer os campos necessários (`db_engine, db_environment, db_instance_id, db_machine_id, app_product_id, app_environment, app_instance_id, app_machine_id, app_module, app_version, contact_name, contact_email, clients(name, domain)`), com joins para nomes (`database_instances(instance_name, version)`, `application_instances(version, environment)`, `application_products(name)`, `db_machine:machines!tickets_db_machine_id_fkey(hostname)`, `app_machine:machines!tickets_app_machine_id_fkey(hostname)`).

- **`src/pages/TicketDetail.tsx`** (quando `ticket.record_type === 'rfc'`): inserir `<RFCContextCards ticket={ticket}/>` no topo da aba "RFC", acima do `TicketRFCReport`. Os dados já vêm de `useTicketDetail`.

- **`src/pages/ClientRFCPortal.tsx`** (visão do cliente, mesma necessidade de contexto): incluir os mesmos cards acima da lista de passos.

## 3. Detalhes técnicos

**Schema**: nenhuma migração necessária — todas as colunas já existem em `tickets`.

**Componente RFCContextCards**:
- Tipa `ticket` como `any` para reuso entre Approval (query enxuta) e TicketDetail (query completa).
- Cada card é um `<Card>` com header (ícone + título) e linhas `Label: valor`.
- Oculta linhas vazias (ex.: cliente sem domínio, ticket APP sem módulo).
- Card de Informações Técnicas alterna entre layout DB e APP via `ticket.segment`.

**Cascade no formulário**: limpar campos dependentes ao trocar pai (engine → instance/machine; product → instance/machine), seguindo o padrão de `NewTicketDialog`.

## Arquivos editados

- `src/components/tickets/RFCFormSection.tsx` — novo bloco "Informações Técnicas".
- `src/components/tickets/RFCContextCards.tsx` — **novo**.
- `src/pages/RFCApproval.tsx` — query expandida + render do componente.
- `src/pages/TicketDetail.tsx` — render do componente acima do conteúdo da aba RFC.
- `src/pages/ClientRFCPortal.tsx` — render do componente.