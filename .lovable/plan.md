## Problema

Após criar o ticket 00101015 e clicar em "Novo ticket", o formulário reabre com todos os campos preenchidos com os dados do ticket anterior. Isso é arriscado: o usuário pode acabar abrindo um ticket para outro cliente ou outro problema sem perceber.

## Causa

Em `src/components/tickets/NewTicketDialog.tsx`:

- O `useForm` mantém o estado entre aberturas (o componente não desmonta).
- O `useEffect` que faz `reset(...)` só executa quando `segment === null`. Depois do primeiro ticket, `segment` já está preenchido, então o reset nunca acontece de novo.
- O `onSubmit` fecha o diálogo (`onOpenChange(false)`) mas não limpa o formulário, anexos selecionados, categoria/subcategoria, contexto de cliente, etc.

## Correção (apenas frontend, escopo do diálogo)

Em `src/components/tickets/NewTicketDialog.tsx`:

1. Adicionar um `useEffect` que dispara toda vez que `open` passa de `false` para `true` e:
   - Chama `reset(...)` com os mesmos defaults usados na criação inicial (segment inicial do cliente atual, `client_id` = `effectiveTenantId` quando aplicável, `frequency: "pontual"`, `business_impact: "medio"`, `ticket_type: "incidente"`, `priority: "P4"`, `started_at` recalculado para "agora").
   - Reseta estados locais relacionados: `segment` (volta a `null` para que o effect de inicialização escolha o segmento padrão do tenant/analista novamente), `uploadFiles` (`[]`), qualquer estado de categoria/subcategoria/contexto selecionado, e mensagens de erro do form (`form.clearErrors()`).
2. Garantir que ao submeter com sucesso o formulário também seja limpo (chamar a mesma rotina de reset após `onOpenChange(false)`), para que mesmo se o componente permanecer montado o próximo open já comece limpo — defesa em profundidade.
3. Respeitar regras existentes:
   - Para analista (`analystSegmentForced`), manter `client_id` vazio após o reset (analista deve escolher cliente).
   - Para usuário direto do cliente, preencher `client_id` com `effectiveTenantId`.
   - Não alterar lógica de SLA, criação, validações Zod, ou qualquer comportamento de backend.

## Fora de escopo

- Nenhuma alteração em Edge Functions, schema, RLS, e-mails ou outros componentes.
- Nenhuma mudança visual nos campos além da limpeza dos valores.
