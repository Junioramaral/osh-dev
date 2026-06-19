## Problema

A aba "Comentários" cresce horizontalmente sem limite, forçando scroll lateral. As causas principais estão em `src/components/tickets/TicketComments.tsx`:

1. O conteúdo do comentário expandido usa `whitespace-pre-wrap` sem `break-words` — qualquer URL longa, linha colada ou texto vindo de email empurra o card.
2. O `<button>` que envolve o `CardHeader` do `Collapsible` não tem `min-w-0` / `block`, então o filho `truncate` perde a referência de largura e cresce.
3. O `ScrollArea` (`h-[400px]`) não está limitado em largura (`w-full` + `max-w-full`) e o `Viewport` interno permite que filhos extrapolem.
4. A coluna de badges/destinatários (`max-w-[55%]` + `break-all`) ainda pode estourar quando o email é muito longo combinado com o lado esquerdo sem `min-w-0` real.

## O que será alterado (somente UI/CSS, sem mexer em lógica)

Arquivo único: `src/components/tickets/TicketComments.tsx`

1. **ScrollArea da lista**
   - `h-[400px]` → `h-[500px] w-full max-w-full overflow-x-hidden` para travar o eixo X.
   - Envolver o `.map` em um `<div className="pr-2">` para o conteúdo respeitar a barra de scroll vertical.

2. **CommentCard**
   - `Card` recebe `overflow-hidden` e `w-full`.
   - `CollapsibleTrigger` `<button>` recebe `block w-full min-w-0 text-left`.
   - O wrapper externo do header (`flex items-start justify-between gap-3`) recebe `min-w-0 w-full`.
   - Coluna direita: trocar `max-w-[55%]` por `max-w-[40%] sm:max-w-[45%]` e manter `break-all` no email para quebrar destinatários longos sem empurrar.
   - Coluna esquerda (autor): já tem `min-w-0 flex-1`; garantir que o `<p className="truncate">` do preview também seja `block` e que o nome use `truncate`.

3. **Conteúdo expandido**
   - Trocar `<p className="text-sm whitespace-pre-wrap">` por `<p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">` para quebrar URLs/strings longas.
   - `CardContent` recebe `overflow-hidden` e `min-w-0` para não permitir que anexos/conteúdo expandam o card.

4. **Layout responsivo do header**
   - Em telas estreitas (≤ sm), empilhar avatar/info acima e badge/destinatários abaixo (`flex-col sm:flex-row`) para evitar competição de largura.

## Fora de escopo

- Lógica de comentários, mutations, notificações, ordenação, persistência de `recipients`, RLS, queries — nada disso muda.
- Outras abas (Timeline, Anexos, SLA) não são tocadas.

## Validação

- Abrir um ticket com comentários longos (incluindo URL extensa e múltiplos destinatários em CC) e confirmar que não há scroll horizontal em 1393px e em viewport mobile.
- Colapsar/expandir cards continua funcionando; preview truncado em uma linha.
