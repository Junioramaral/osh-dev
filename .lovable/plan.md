## Objetivo

Garantir que o card "Análise" (e os demais campos de `TicketDetails.tsx`) quebrem linha corretamente e tenham espaçamento adequado em telas pequenas (≤390px), sem overflow horizontal.

## Problemas identificados em `src/components/tickets/TicketDetails.tsx`

1. **InfoRow** usa `flex justify-between` sem permitir quebra: rótulo e valor disputam espaço; valores longos (hostnames, e-mails, nomes de instância) podem ser comprimidos ou estourar.
2. Blocos do card **Análise** (`Motivo da Abertura`, `Problema Enfrentado`, `Passos para Reprodução`, `Workaround`) usam `whitespace-pre-wrap` sem `break-words` — URLs ou tokens longos sem espaço causam overflow horizontal.
3. O bloco **Erro Exibido** (`<pre><code>`) só tem `overflow-x-auto`; em mobile fica com scroll horizontal sem indicação. Manter scroll é aceitável (é código), mas garantir `max-w-full` e largura confinada ao card.
4. `CardContent` padrão usa `p-6` (24px) — em 390px sobra pouco espaço útil. Reduzir para `p-4 sm:p-6` apenas nos cards de detalhes.

## Mudanças

### `src/components/tickets/TicketDetails.tsx`

- **InfoRow**: trocar `flex justify-between` por layout responsivo:
  - Mobile: `flex flex-col gap-0.5` (label em cima, valor embaixo).
  - `sm:` em diante: `sm:flex-row sm:justify-between sm:items-start sm:gap-4`.
  - Valor recebe `break-words text-right sm:text-right` (em mobile fica alinhado à esquerda naturalmente pelo flex-col).
- **Blocos de texto do card Análise**: adicionar `break-words` junto de `whitespace-pre-wrap` em todos os `<div className="bg-muted p-3 ...">`.
- **Bloco Erro Exibido (`<pre>`)**: manter `overflow-x-auto`, adicionar `max-w-full` e `whitespace-pre` explícito (já é default do `<pre>`); garantir que o pai (`CardContent`) não cause overflow — adicionar `min-w-0` quando necessário.
- **CardContent** dos quatro cards: padding responsivo `p-4 sm:p-6` (sobrescrever via className).
- **CardHeader**: ajustar `pb-3` já está ok; nada a mudar.

### Escopo

Apenas `src/components/tickets/TicketDetails.tsx`. Sem mudanças de lógica, hooks ou dados. Sem alterações em outros componentes do TicketDetail (sidebar, header, timeline).

## Validação

Após a aplicação, abrir um ticket no preview mobile (390x754) e conferir:
- Nenhum scroll horizontal na página.
- Labels e valores legíveis no card "Informações Técnicas" e "Detalhes do Ticket".
- Blocos de texto longos quebram dentro do card.
- Bloco de erro com scroll horizontal interno, sem estourar o card.
