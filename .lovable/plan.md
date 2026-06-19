## Problemas identificados

**1. Texto cortado nos comentários expandidos (print 1)**
O `ScrollArea` da shadcn (baseado em Radix) define internamente `display: table` no Viewport, fazendo com que os filhos cresçam até o tamanho do conteúdo em vez de respeitar a largura do container. Por isso, mesmo com `break-words`, o card cresce horizontalmente e o texto fica cortado na borda direita.

**2. Margens laterais vazias na tela do ticket (print 2)**
A `AppLayout` usa `container mx-auto p-6`, que aplica uma largura máxima padrão (geralmente ~1280px no breakpoint xl). Em telas largas isso deixa grandes faixas vazias dos dois lados, exatamente como o usuário marcou em vermelho.

## Mudanças propostas (apenas UI, sem regras de negócio)

### `src/components/tickets/TicketComments.tsx`
- Substituir o `ScrollArea` por uma `div` simples com `max-h-[500px] overflow-y-auto w-full min-w-0` para a lista de comentários. Isso elimina o `display: table` interno do Radix que está fazendo os cards crescerem.
- Manter o `whitespace-pre-wrap break-words [overflow-wrap:anywhere]` no conteúdo expandido — agora ele vai realmente respeitar a largura.
- Remover o import do `ScrollArea`.

### `src/pages/TicketDetail.tsx`
- Aplicar o padrão de layout full-width já usado em outras telas do projeto (memo "Full Width Layouts"): envolver o conteúdo do ticket em `-mx-6 px-2` (ou equivalente) para neutralizar o `container mx-auto p-6` da `AppLayout` apenas nesta página, usando toda a largura disponível.
- Aumentar levemente a largura do sidebar direito em telas grandes (de `lg:w-80` para `lg:w-96`) para equilibrar a expansão.

## Fora do escopo
- Nenhuma alteração em envio de comentários, anexos, notificações, banco de dados, RLS ou Edge Functions.
- Não vou alterar a `AppLayout` global — a expansão fica restrita à tela de detalhe do ticket para não afetar outras telas.

## Diagrama da raiz do bug do texto

```text
ScrollArea (overflow-hidden)
└── Viewport [display: table]   <-- causa o estouro
    └── div (pr-2 w-full)
        └── Card (w-full)        <-- "w-full" vira "100% da célula da tabela",
            └── texto longo      que cresce com o conteúdo, ignorando o pai
```

Trocando por `<div className="max-h-[500px] overflow-y-auto">`, o filho passa a respeitar a largura do pai e o `break-words` funciona corretamente.
