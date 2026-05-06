## Problemas a corrigir

### 1. Não consegue rolar até o comentário / botões na tela de Aprovação de RFC

Em `src/pages/RFCApproval.tsx` o painel direito é um `flex flex-col h-full` com `<ScrollArea className="flex-1">`. O Radix `ScrollArea` precisa de **altura explícita** no viewport interno — `flex-1` em alguns layouts não propaga a altura para o `ScrollAreaViewport`, então o conteúdo overflowa sem ativar a barra.

Correção: trocar `flex-1` por `flex-1 h-0` (ou `min-h-0`) na `ScrollArea`, e garantir que o container pai (`flex flex-col h-full`) tenha `min-h-0`. Esse é o fix idiomático para ScrollArea dentro de flexbox.

Alternativa equivalente: aplicar `h-full` na `ScrollArea` e `overflow-hidden min-h-0` no parent. Vou usar `flex-1 min-h-0` na ScrollArea (mais simples).

### 2. RFC com status "Aguardando Aprovação" não aparece em /tickets

Em `src/pages/Tickets.tsx` (linhas 38–46) a lista `STATUS_OPTIONS` não inclui os status específicos de RFC:

```ts
const STATUS_OPTIONS = [
  { value: "rascunho", ... },
  { value: "novo", ... },
  { value: "em_atendimento", ... },
  { value: "aguardando_cliente", ... },
  { value: "resolvido", ... },
  { value: "fechado", ... },
];
```

Faltam:
- `aguardando_aprovacao` → "Aguardando Aprovação"
- `aprovado` → "Aprovado"

Sem eles, o filtro de status nunca casa com a RFC e o registro fica oculto.

Correção: adicionar as duas opções a `STATUS_OPTIONS`. Eles não entram em `DEFAULT_STATUS_FILTERS` (mantém o default atual) — o usuário precisa marcá-los manualmente, igual a "Resolvido"/"Fechado".

## Arquivos a editar

- `src/pages/RFCApproval.tsx` — adicionar `min-h-0` na `ScrollArea` do painel direito.
- `src/pages/Tickets.tsx` — incluir `aguardando_aprovacao` e `aprovado` em `STATUS_OPTIONS`.
