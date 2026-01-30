

# Plano: Remover Botoes Redundantes na Aba de Projetos

## Problema Identificado

Na tela de clientes, quando o usuario esta na aba "Projetos", existem dois conjuntos de botoes:

1. **Botoes do projeto**: "Cancelar" e "Salvar" (para criar/editar projetos individuais)
2. **Botoes do dialog**: "Cancelar" e "Salvar Alteracoes" (para salvar dados do cliente)

Os botoes do dialog sao redundantes na aba Projetos porque:
- Projetos sao salvos individualmente diretamente no banco
- Nao ha dados do cliente a salvar quando esta na aba de projetos

---

## Solucao Proposta

Ocultar os botoes do footer do dialog quando a aba "Projetos" estiver selecionada.

---

## Alteracoes

### Arquivo: `src/components/clients/ClientDialog.tsx`

1. Adicionar estado para rastrear a aba ativa:
```typescript
const [activeTab, setActiveTab] = useState("basic");
```

2. Modificar o componente Tabs para usar estado controlado:
```typescript
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
```

3. Ocultar os botoes quando estiver na aba de projetos:
```typescript
{activeTab !== "projects" && (
  <div className="flex justify-end gap-2">
    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
      Cancelar
    </Button>
    <Button type="submit" disabled={isLoading}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {mode === "create" ? "Criar Cliente" : "Salvar Alteracoes"}
    </Button>
  </div>
)}
```

---

## Comportamento Esperado

| Aba Selecionada | Botoes Visiveis |
|-----------------|-----------------|
| Informacoes Basicas | Cancelar + Salvar Alteracoes |
| Contrato | Cancelar + Salvar Alteracoes |
| SLAs | Cancelar + Salvar Alteracoes |
| Projetos | Nenhum (projetos tem seus proprios botoes) |

---

## Resultado Visual

### Antes (Aba Projetos)
```text
┌─────────────────────────────────────────────────┐
│  [Novo Projeto] [Cancelar] [Salvar]             │
│                                                 │
│  Projeto LEXIS-HE     [Ativo] [Editar] [Excluir]│
│                                                 │
│           [Cancelar] [Salvar Alteracoes]  <-- REDUNDANTE
└─────────────────────────────────────────────────┘
```

### Depois (Aba Projetos)
```text
┌─────────────────────────────────────────────────┐
│  [Novo Projeto] [Cancelar] [Salvar]             │
│                                                 │
│  Projeto LEXIS-HE     [Ativo] [Editar] [Excluir]│
│                                                 │
│                                   <-- LIMPO!    │
└─────────────────────────────────────────────────┘
```

