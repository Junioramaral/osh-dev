

# Tornar a tabela de Tickets responsiva e ocupar toda a largura

## Problema

A tabela de tickets está contida dentro de um `Card` que está dentro do `container` do `AppLayout` (max-width: 1400px). Em telas maiores, sobra espaço horizontal não aproveitado. Em telas menores, as colunas ficam apertadas sem possibilidade de scroll horizontal.

## Solução

### `src/pages/Tickets.tsx`

1. **Expandir horizontalmente**: Envolver todo o conteúdo da página em `<div className="-mx-6 px-2">` (mesma técnica usada no `ClientRFCPortal`) para escapar do container e ocupar toda a largura disponível

2. **Scroll horizontal na tabela**: O componente `Table` já possui `overflow-auto` no wrapper div. Adicionar `min-w-[1200px]` na tag `<table>` para garantir que em telas menores haja scroll horizontal ao invés de comprimir as colunas

### Resultado
- Em telas grandes: a tabela ocupa toda a largura disponível, sem espaço em branco
- Em telas menores: scroll horizontal permite visualizar todas as colunas sem distorção

