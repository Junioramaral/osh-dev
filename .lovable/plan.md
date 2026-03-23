

# Expandir espaço horizontal da tela "Minhas RFCs"

## Problema

O conteúdo da página é envolvido por `<div className="container mx-auto p-6">` no `AppLayout.tsx` (linha 149). A classe `container` do Tailwind limita a largura máxima a 1400px (configurado no `tailwind.config.ts`), criando o espaço em branco nas laterais.

## Solução

Duas opções possíveis:

**Opção A (recomendada)**: Modificar apenas `ClientRFCPortal.tsx` para usar margem negativa e largura total, sobrescrevendo o container pai. Isso não afeta outras páginas.

- Envolver o conteúdo da página com uma div que usa classes como `max-w-none -mx-6` para escapar do container e ocupar toda a largura disponível, ou usar `px-2` para manter um padding mínimo.

**Opção B**: Aceitar uma prop no `AppLayout` para desabilitar o container (ex: `fullWidth`), e usá-la no `ClientRFCPortal`.

Vou seguir a **Opção A** por ser mais simples e isolada.

## Mudança

### `src/pages/ClientRFCPortal.tsx`
- Envolver todo o conteúdo retornado em uma `<div className="-mx-6 px-2">` para expandir horizontalmente além do container, mantendo um padding mínimo nas bordas.

