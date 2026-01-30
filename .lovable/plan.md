

# Plano: Restaurar Aba de Produtos nas Configuracoes

## Problema Identificado

Durante a reorganizacao das abas de Configuracoes do Sistema, o conteudo da aba **"Produtos"** foi acidentalmente removido. 

O arquivo `SystemSettings.tsx` possui:
- `TabsTrigger value="products"` na linha 484 (botao da aba existe)
- **Mas nao possui** o `TabsContent value="products"` correspondente

A estrutura atual vai direto de `</TabsContent>` de Servicos (linha 924) para `TabsContent value="teams"` (linha 927), pulando a aba de Produtos.

---

## Solucao

Adicionar o `TabsContent value="products"` com a tabela de gerenciamento de produtos de aplicacao, seguindo o mesmo padrao das outras abas.

---

## Arquivo a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/pages/SystemSettings.tsx` | Modificar | Adicionar TabsContent de Produtos entre Servicos e Times |

---

## Conteudo a Adicionar

O conteudo da aba de Produtos deve ser inserido entre a linha 924 (fechamento de Servicos) e linha 927 (inicio de Times):

```typescript
{/* Products Tab */}
<TabsContent value="products" className="mt-6">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-lg font-semibold">Produtos de Aplicacao</h2>
    {!isReadOnly && (
      <Button
        onClick={() => {
          setSelectedProduct(null);
          setProductDialogOpen(true);
        }}
      >
        <Plus className="h-4 w-4 mr-2" />
        Novo Produto
      </Button>
    )}
  </div>

  <div className="border rounded-lg">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Descricao</TableHead>
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead className="w-[120px]">Acoes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {productsLoading ? (
          // Skeleton loading
        ) : products?.length === 0 ? (
          // Empty state
        ) : (
          products?.map((product) => (
            // Linha clicavel com nome, descricao, status e acoes
          ))
        )}
      </TableBody>
    </Table>
  </div>
</TabsContent>
```

---

## Funcionalidades da Aba de Produtos

A aba tera as mesmas funcionalidades das outras abas:

| Funcionalidade | Descricao |
|----------------|-----------|
| Listar produtos | Tabela com nome, descricao e status |
| Criar produto | Botao "Novo Produto" abre `AppProductDialog` |
| Editar produto | Clique na linha abre dialog de edicao |
| Ativar/Desativar | Menu dropdown com toggle de status |
| Excluir produto | Menu dropdown com opcao de remover |

---

## Estados e Dialogs Ja Existentes

Os estados e mutations necessarios ja estao no arquivo:

- `productDialogOpen` / `setProductDialogOpen` (linha 68)
- `selectedProduct` / `setSelectedProduct` (linha 72)
- `deleteProductId` / `setDeleteProductId` (linha 76)
- `toggleProductMutation` (linha 303)
- `deleteProductMutation` (linha 340)
- `products` / `productsLoading` (linha 162)
- `AppProductDialog` importado (linha 35)

---

## Resultado Esperado

Apos a correcao, a aba "Produtos" exibira:

```text
Produtos de Aplicacao                        [Novo Produto]
─────────────────────────────────────────────────────────────
Nome         │ Descricao           │ Status │ Acoes
─────────────┼─────────────────────┼────────┼───────────────
ContaDia     │ Sistema contabil    │ Ativo  │ [...]
RH Express   │ Gestao de RH        │ Ativo  │ [...]
─────────────────────────────────────────────────────────────
```

