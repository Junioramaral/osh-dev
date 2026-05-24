## Problema

Ao clicar em "Salvar Alterações" no diálogo de Editar Cliente (abas Informações Básicas, Contrato e SLAs), o diálogo fecha automaticamente e o usuário volta para a lista de clientes, perdendo o contexto da edição em andamento. A aba Projetos não tem esse problema porque o salvar ali é independente.

## Solução

Manter o diálogo aberto após salvar com sucesso. O cliente continua na mesma aba que estava editando, podendo navegar para outras abas, fazer mais ajustes ou fechar manualmente quando terminar.

## Mudanças

**`src/components/clients/ClientDialog.tsx`** — função `onSubmit`:
- Remover `onOpenChange(false)` após salvar.
- Remover `form.reset()` após salvar (no modo edit; manter reset apenas no modo create se decidir fechar nesse modo).
- No modo `create`: após criar o cliente com sucesso, **transicionar para modo edit** mantendo o diálogo aberto, para permitir cadastrar Projetos e demais detalhes do cliente recém-criado. Isso exige que o componente passe a guardar o `client` retornado pelo `createClient.mutateAsync` em estado interno e que o pai (`Clients.tsx`) consiga refletir essa edição. Alternativa mais simples: manter aberto no modo edit; no modo create, fechar como hoje (o usuário reabre o cliente recém-criado se quiser editar Projetos).

Recomendo a alternativa simples (menor risco): **modo edit nunca fecha automaticamente**; modo create continua fechando ao criar (comportamento atual já é coerente, pois a aba Projetos no create está bloqueada com mensagem "Salve o cliente primeiro").

- O toast "Cliente atualizado com sucesso!" do hook `useUpdateClient` já dá feedback visual suficiente de que salvou.
- Manter o botão "Cancelar" (que chama `onOpenChange(false)`) como única forma de fechar manualmente, junto do X padrão do Dialog.

## Resumo das telas analisadas

| Aba | Comportamento atual ao salvar | Após correção |
|---|---|---|
| Informações Básicas | Fecha o diálogo | Permanece aberto |
| Contrato | Fecha o diálogo | Permanece aberto |
| SLAs | Fecha o diálogo | Permanece aberto |
| Projetos | Já permanece aberto (correção anterior) | Sem alteração |

Nenhuma alteração em hooks, RLS ou backend é necessária.
