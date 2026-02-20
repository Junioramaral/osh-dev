
# Correção: Campo "Comentário" perde foco ao digitar

## Causa Raiz

O problema está na estrutura do `RFCApproval.tsx`. Os "componentes" `ListPanel` e `DetailPanel` são declarados como funções dentro do corpo de `RFCApproval`:

```tsx
// DENTRO do componente RFCApproval:
const ListPanel = () => (...)
const DetailPanel = () => (...)
```

Quando o usuário digita no `Textarea`, o estado `comentario` muda → o React re-renderiza `RFCApproval` → as funções `ListPanel` e `DetailPanel` são **recriadas do zero** → o React entende que são componentes completamente novos → **desmonta o DOM antigo e monta um novo** → o `Textarea` perde o foco.

Esse é um anti-pattern conhecido: nunca declare componentes dentro de outros componentes.

## Correção

**Arquivo:** `src/pages/RFCApproval.tsx`

**Estratégia:** Transformar `<ListPanel />` e `<DetailPanel />` em **JSX inline**, removendo as declarações `const ListPanel = () => (...)` e `const DetailPanel = () => (...)` do interior do componente. O conteúdo de cada um será renderizado diretamente no lugar onde eram chamados, sem ser "componente", apenas blocos de JSX.

Todo o código permanece idêntico — apenas o mecanismo de encapsulamento muda de "componente filho redeclarado a cada render" para "JSX inline estático".

## O que muda

- Remove as linhas `const ListPanel = () => (...)` e `const DetailPanel = () => (...)`
- Substitui `<ListPanel />` e `<DetailPanel />` pelo JSX equivalente inline no `return` principal
- **Zero mudança visual ou funcional** — apenas a estrutura interna de React

## O que NÃO muda

- Aparência da tela
- Queries, handlers (approve/reject), estados
- Responsividade mobile
- Qualquer outra página
