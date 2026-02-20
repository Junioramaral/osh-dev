
# Reordenação dos Campos no Formulário de Novo Ticket

## Objetivo

Reorganizar a ordem dos campos no formulário `NewTicketDialog.tsx` de acordo com o perfil do usuário:

**Fluxo para usuário Otimizzo (dono do sistema):**
1. Cliente
2. Segmento
3. Tipo + Prioridade + Categoria
4. (resto permanece igual)

**Fluxo para usuário Cliente:**
1. Segmento
2. Tipo + Prioridade + Categoria
3. (resto permanece igual)

---

## Diagnóstico do Código Atual

A ordem atual no JSX (linhas 592–743 do `NewTicketDialog.tsx`) é:

```text
1. Segmento (único ou dropdown)          ← linhas 594–624
2. Grid com: Cliente (Otimizzo)          ← linhas 627–651
3. FAQ Selector                          ← linhas 653–661
4. Título                                ← linhas 663–667
5. Fila (só Otimizzo)                    ← linhas 669–695
6. Tipo + Prioridade + Categoria (grid)  ← linhas 696–743
7. Subcategoria                          ← linhas 745–762
8. Campos DB/APP específicos...
```

O problema é que **Cliente** aparece depois de **Segmento**, quando deveria ser o primeiro campo para o usuário Otimizzo.

---

## Mudanças Necessárias

### Arquivo a Modificar
`src/components/tickets/NewTicketDialog.tsx` — apenas o bloco JSX (a partir da linha 592), sem tocar na lógica de estado, queries ou handlers.

### Nova Ordem JSX

```text
Para Otimizzo:
1. Cliente                               ← mover para antes do Segmento
2. Segmento (condicional: só exibir após cliente selecionado)
3. FAQ Selector
4. Título
5. Fila (só Otimizzo)
6. Tipo + Prioridade + Categoria (grid)
7. Subcategoria
8. Campos DB/APP...

Para Cliente:
1. Segmento
2. FAQ Selector
3. Título
4. Tipo + Prioridade + Categoria (grid)
5. Subcategoria
6. Campos DB/APP...
```

### Detalhe: Segmento condicional para Otimizzo

Para o usuário Otimizzo, o campo Segmento deve aparecer após a seleção do cliente (pois os segmentos disponíveis dependem do cliente escolhido). Assim, o Segmento só é exibido quando `selectedClientId` está preenchido:

```tsx
{/* Para Otimizzo: Cliente primeiro */}
{isOtimizzoTenant && (
  <div className="space-y-2">
    <Label>Cliente *</Label>
    <Select ...>...</Select>
  </div>
)}

{/* Segmento: sempre visível para cliente, visível após escolher cliente para Otimizzo */}
{(!isOtimizzoTenant || selectedClientId) && (
  /* bloco do segmento atual */
)}

{/* FAQ Selector */}
{selectedClientId && <FAQSelector ... />}

{/* Título */}
<div>...</div>

{/* Fila (só Otimizzo) */}
{isOtimizzoUser && ...}

{/* Tipo + Prioridade + Categoria */}
<div className="grid grid-cols-3 gap-4">...</div>
```

---

## O que NÃO muda

- Toda a lógica de estado (`segment`, `effectiveTenantId`, `isOtimizzoTenant`)
- Todas as queries de dados (clientes, segmentos, categorias, instâncias)
- Os handlers (`handleSegmentChange`, `handleCategoryChange`)
- Os `useEffect`s de auto-seleção e limpeza de campos
- Os campos técnicos DB/APP (Engine, Instância, Ambiente, etc.)
- Os campos de descrição (Título, Motivo, Problema, etc.)
- A lógica de submit e upload

---

## Impacto Visual

### Antes (Otimizzo)
```text
[Segmento         ]
[Cliente          ]
[FAQ Selector     ]
[Título           ]
[Fila             ]
[Tipo] [Prior.] [Cat.]
```

### Depois (Otimizzo)
```text
[Cliente          ]
[Segmento         ]  ← aparece após cliente selecionado
[FAQ Selector     ]
[Título           ]
[Fila             ]
[Tipo] [Prior.] [Cat.]
```

### Antes e Depois (Cliente - sem mudança de conteúdo, só confirmação que está correto)
```text
[Segmento fixo ou dropdown]
[FAQ Selector              ]
[Título                    ]
[Tipo] [Prior.] [Cat.]
```
