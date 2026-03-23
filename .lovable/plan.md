

# Corrigir overflow nos cards de SLA Metrics

## Problema
Os cards de métricas SLA estão com conteúdo extrapolando os limites, especialmente o badge "Fora do expediente" e valores longos como "13h 28min". O padding `p-6` e gap `gap-4` são grandes demais para 4 colunas, e o badge "Fora do expediente" é texto longo.

## Solução

### Arquivo: `src/components/tickets/SLAMetricsCards.tsx`

1. **Reduzir padding** dos cards: `p-6` → `p-4`
2. **Reduzir gap** entre ícone e texto: `gap-4` → `gap-3`
3. **Reduzir tamanho do ícone container**: `p-3` → `p-2`, ícone `h-6 w-6` → `h-5 w-5`
4. **Reduzir tamanho do valor**: `text-2xl` → `text-xl`
5. **Encurtar badge** "Fora do expediente" → "Fora HU" (mais compacto)
6. **Adicionar `min-w-0`** no container de texto e `truncate` no label para prevenir overflow
7. **Flex wrap** no container label+badge para que o badge quebre linha se necessário

