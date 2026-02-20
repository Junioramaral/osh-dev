
# Reordenação: Tipo, Prioridade e Categoria logo após Segmento

## Problema Identificado

A ordem atual no JSX (após a última edição) está assim:

```text
1. Cliente (Otimizzo)
2. Segmento
3. FAQ Selector
4. Título
5. Fila (Otimizzo)
6. Tipo + Prioridade + Categoria   ← ERRADO: deveria ser logo após Segmento
7. Subcategoria
8. Campos DB/APP...
```

O pedido é que **Tipo, Prioridade e Categoria** fiquem imediatamente após o **Segmento**, para ambos os perfis.

## Ordem Correta Desejada

```text
Para Otimizzo:
1. Cliente
2. Segmento
3. Tipo + Prioridade + Categoria   ← mover para cá
4. FAQ Selector
5. Título
6. Fila
7. Subcategoria
8. Campos DB/APP...

Para Cliente:
1. Segmento
2. Tipo + Prioridade + Categoria   ← mover para cá
3. FAQ Selector
4. Título
5. Subcategoria
6. Campos DB/APP...
```

## Arquivo a Modificar

`src/components/tickets/NewTicketDialog.tsx` — apenas reposicionamento do bloco JSX entre as linhas 695–742 (grid `grid-cols-3` com Tipo, Prioridade, Categoria), movendo-o para imediatamente após o bloco do Segmento (linha 650).

## Mudança Técnica

Recortar o bloco `<div className="grid grid-cols-3 gap-4">` (Tipo + Prioridade + Categoria) das linhas 695–742 e inserir logo após o fechamento do bloco de Segmento (após a linha 650), antes do FAQ Selector.

### Bloco a mover (atual nas linhas 695–742):
```tsx
<div className="grid grid-cols-3 gap-4">
  {/* Tipo */}
  {/* Prioridade */}
  {/* Categoria */}
</div>
```

### Nova posição (após linha 650, antes do FAQ Selector):
```tsx
{/* 2. Segmento */}
{...segmento...}

{/* 3. Tipo + Prioridade + Categoria */}
<div className="grid grid-cols-3 gap-4">
  ...
</div>

{/* 4. FAQ Selector */}
{selectedClientId && <FAQSelector ... />}

{/* 5. Título */}
<div className="space-y-2">...</div>

{/* 6. Fila (só Otimizzo) */}
{isOtimizzoUser && ...}

{/* 7. Subcategoria */}
{selectedCategoryId && ...}
```

## O que NÃO muda

- Nenhuma lógica de estado, handlers ou queries
- Nenhum campo é removido ou alterado
- Subcategoria permanece após Categoria (dependente dela)
- Campos técnicos DB/APP continuam na mesma posição
- Campos Título e Fila permanecem na sequência após o novo bloco de Tipo/Prioridade/Categoria
