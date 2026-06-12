# Corrigir busca de tickets vinculáveis no diálogo "Resolver Ticket"

## Problema

No diálogo de resolução, na seção "Vincular outros tickets do cliente":

1. O ícone de lupa é **apenas decorativo** (dentro do Input), mas o usuário tenta clicá-lo esperando abrir/expandir a busca.
2. O filtro só aceita substring literal — caracteres curinga como `*` não funcionam e retornam "Nenhum ticket encontrado", dando a impressão de que a busca está quebrada.
3. Quando o cliente não tem tickets no escopo (abertos ou resolvidos nos últimos 30 dias), a lista aparece vazia sem explicação clara do motivo.

## Solução

### 1. `TicketResolveDialog.tsx`
- Remover a expectativa de clique na lupa: manter ícone decorativo mas adicionar **botão "X" para limpar** a busca quando houver texto (mais útil que um botão de lupa).
- Tratar `*` (e variantes `**`, `?`) como "mostrar tudo": se a query após trim for só asteriscos/curingas, ignorar o filtro.
- Normalizar a busca: remover `#` inicial (usuário costuma digitar `#00101012`) e comparar tanto contra `ticket_number` quanto contra `title` case-insensitive (já feito, mas adicionar normalização de número).
- Melhorar mensagens vazias:
  - Se `linkable.length === 0` (sem candidatos no escopo): "Este cliente não tem outros tickets abertos ou resolvidos nos últimos 30 dias."
  - Se filtro não retorna nada: "Nenhum ticket corresponde a \"{query}\". Use * para listar todos."
- Mostrar contador total: "Mostrando X de Y tickets" acima da lista.
- Adicionar `placeholder` mais explicativo: `"Buscar por número (ex: 00101012) ou título — use * para ver todos"`.

### 2. `useClientLinkableTickets.ts`
- Sem mudança de escopo, mas adicionar log de debug temporário só em dev caso a lista venha vazia (para diagnóstico futuro) — opcional, pode pular.

## Fora de escopo

- Não alterar o escopo (abertos + resolvidos 30d) — já confirmado pelo usuário anteriormente.
- Não alterar `BulkStatusReasonDialog`.
- Não mudar a persistência nem o efeito do vínculo.
