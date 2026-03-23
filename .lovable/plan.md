

# Expandir altura do card "Minhas RFCs" para ocupar toda a tela

## Problema

O card usa `h-[calc(100vh-180px)]` mas o offset não é suficiente para cobrir toda a altura restante, deixando espaço vazio embaixo.

## Solução

### `src/pages/ClientRFCPortal.tsx`

1. **Tornar o container flex vertical** — envolver o conteúdo em um layout flex com `min-h-[calc(100vh-120px)]` para o wrapper externo (`-mx-6 px-2`), com `flex flex-col`

2. **Card cresce para preencher** — trocar a altura fixa do grid de `h-[calc(100vh-180px)]` para `flex-1` no Card e no grid interno, fazendo o card crescer automaticamente para ocupar todo o espaço restante

Mudanças concretas:
- Linha 143: `<div className="-mx-6 px-2">` → `<div className="-mx-6 px-2 flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>`
- Linha 156: `<Card className="overflow-hidden">` → `<Card className="overflow-hidden flex-1 flex flex-col">`
- Linha 157: remover `h-[calc(100vh-180px)] min-h-[500px]` e usar `flex-1 min-h-0` no grid

