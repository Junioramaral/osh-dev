

# Fix: Scroll e aproveitamento de espaço na tela "Minhas RFCs"

## Problema

O layout usa `h-[calc(100vh-220px)]` (linha 128) que limita a altura do card. O painel direito tem `ScrollArea` mas o conteúdo dos passos está sendo cortado, impedindo ver o passo 4. Além disso, o card não aproveita a largura disponível da tela.

## Mudanças

### `src/pages/ClientRFCPortal.tsx`

1. **Expandir largura do painel de lista**: Mudar `md:grid-cols-[300px_1fr]` para `md:grid-cols-[340px_1fr]` (ganho sutil)

2. **Corrigir altura do container**: Aumentar a área útil reduzindo o offset — mudar `h-[calc(100vh-220px)]` para `h-[calc(100vh-180px)]` para aproveitar melhor o espaço vertical

3. **Garantir scroll funcional no painel direito**: O `ScrollArea` (linha 198) já existe, mas precisa garantir que o conteúdo interno não tenha constraints que impeçam o scroll. Adicionar `min-h-0` ao container flex pai do painel direito (linha 181) para que o flex item possa encolher e ativar o scroll

Essas 3 pequenas alterações resolvem ambos os problemas: o scroll passa a funcionar corretamente e o espaço em branco é reduzido.

