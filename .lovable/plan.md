

# Plano: Reorganizar Configurações com Grupo "Serviços"

## Objetivo

Criar uma nova estrutura de navegação na tela de Configurações do Sistema, agrupando as abas "Engines", "Filas" e "Categorias" sob um novo item chamado **"Serviços"**.

---

## Estrutura Atual vs. Proposta

### Antes (7 abas em linha)
```text
┌──────┬─────────┬──────────┬───────┬────────────┬───────┬───────────┐
│Geral │ Engines │ Produtos │ Filas │ Categorias │ Times │ Segmentos │
└──────┴─────────┴──────────┴───────┴────────────┴───────┴───────────┘
```

### Depois (5 abas principais + subnavegação)
```text
┌──────┬──────────┬──────────┬───────┬───────────┐
│Geral │ Serviços │ Produtos │ Times │ Segmentos │
└──────┴──────────┴──────────┴───────┴───────────┘

Ao clicar em "Serviços":
┌─────────────────────────────────────────────────────────────────┐
│  Serviços                                                       │
│  ───────────────────────────────────────────────────────────    │
│  ┌─────────┐ ┌───────┐ ┌────────────┐                           │
│  │ Engines │ │ Filas │ │ Categorias │                           │
│  └─────────┘ └───────┘ └────────────┘                           │
│                                                                 │
│  [Conteúdo da sub-aba selecionada]                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/SystemSettings.tsx` | Modificar | Reestruturar abas com Tabs aninhadas |

---

## Detalhes da Implementação

### 1. Reduzir para 5 abas principais

```typescript
<TabsList className="grid w-full max-w-4xl grid-cols-5">
  <TabsTrigger value="general">Geral</TabsTrigger>
  <TabsTrigger value="services">Serviços</TabsTrigger>  {/* NOVO */}
  <TabsTrigger value="products">Produtos</TabsTrigger>
  <TabsTrigger value="teams">Times</TabsTrigger>
  <TabsTrigger value="segments">Segmentos</TabsTrigger>
</TabsList>
```

### 2. Criar sub-navegação dentro de "Serviços"

```typescript
<TabsContent value="services" className="mt-6">
  <Tabs defaultValue="engines">
    <TabsList className="mb-4">
      <TabsTrigger value="engines" className="gap-2">
        <Database className="h-4 w-4" />
        Engines
      </TabsTrigger>
      <TabsTrigger value="queues" className="gap-2">
        <ListOrdered className="h-4 w-4" />
        Filas
      </TabsTrigger>
      <TabsTrigger value="categories" className="gap-2">
        <Tag className="h-4 w-4" />
        Categorias
      </TabsTrigger>
    </TabsList>

    <TabsContent value="engines">
      {/* Conteúdo de Engines (já existente) */}
    </TabsContent>
    
    <TabsContent value="queues">
      {/* Conteúdo de Filas (já existente) */}
    </TabsContent>
    
    <TabsContent value="categories">
      {/* Conteúdo de Categorias (já existente) */}
    </TabsContent>
  </Tabs>
</TabsContent>
```

---

## Ícone para "Serviços"

Utilizarei o ícone `Server` do Lucide para representar "Serviços", pois sugere infraestrutura e backend.

```typescript
import { Server } from "lucide-react";

<TabsTrigger value="services" className="gap-2">
  <Server className="h-4 w-4" />
  Serviços
</TabsTrigger>
```

---

## Resultado Visual

```text
Configurações do Sistema
─────────────────────────────────────────────────────────

  ┌──────┐  ┌──────────┐  ┌──────────┐  ┌───────┐  ┌───────────┐
  │ Geral│  │ Serviços │  │ Produtos │  │ Times │  │ Segmentos │
  └──────┘  └──────────┘  └──────────┘  └───────┘  └───────────┘
            ▼ (selecionado)

  ┌─────────┐  ┌───────┐  ┌────────────┐
  │ Engines │  │ Filas │  │ Categorias │
  └─────────┘  └───────┘  └────────────┘
       ▲
  (selecionado)

  ┌─────────────────────────────────────────────────────────────┐
  │ Engines de Banco de Dados                     [Novo Engine] │
  ├─────────────────────────────────────────────────────────────┤
  │ Nome          │ Descrição      │ Status  │ Ações            │
  ├───────────────┼────────────────┼─────────┼──────────────────┤
  │ PostgreSQL    │ ...            │ Ativo   │ [...]            │
  │ MySQL         │ ...            │ Ativo   │ [...]            │
  │ MongoDB       │ ...            │ Ativo   │ [...]            │
  └─────────────────────────────────────────────────────────────┘
```

---

## Benefícios

1. **Organização lógica**: Agrupa configurações relacionadas a serviços de suporte
2. **Menos abas principais**: De 7 para 5, mais limpo visualmente
3. **Escalabilidade**: Facilita adicionar mais sub-itens a "Serviços" no futuro
4. **Navegação intuitiva**: Sub-abas dentro do contexto de Serviços

