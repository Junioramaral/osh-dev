
# Badge RFC na Listagem de Tickets

## Objetivo

Diferenciar visualmente os registros do tipo RFC dos tickets de suporte normais nas páginas `/tickets` e `/meus-tickets`, sem adicionar uma nova coluna e sem quebrar o layout existente.

---

## Estratégia: Badge Inline na Coluna "Título"

A abordagem mais limpa é inserir o badge `RFC` diretamente na célula de **Título**, ao lado do texto. Isso não altera o número de colunas, não precisa de cabeçalho novo e funciona em todas as resoluções de tela.

O campo `record_type` já é retornado pelo `SELECT *` das queries em `Tickets.tsx` e `MyTickets.tsx` — nenhuma alteração de query é necessária.

### Aparência visual

```
Número   Título
------   -------
000042   [RFC]  Migração Oracle → PostgreSQL
000041           Erro ao conectar no banco de dados
000039   [RFC]  Atualização de certificados SSL
```

O badge RFC terá cor roxa/violeta — distinta de todos os outros badges já existentes:
- Status: azul, roxo, amarelo, verde, cinza
- Prioridade: vermelho, laranja, amarelo, azul
- Time: azul (DB) / verde (APP)
- Fila: roxo mais escuro

Usaremos uma tonalidade **violeta** (`violet`) que ainda não está em uso, garantindo diferenciação imediata.

---

## Filtro por Tipo (Bônus)

Além do badge visual, será adicionado um filtro "Tipo" (`all` | `ticket` | `rfc`) nos selects de ambas as páginas, para que o usuário possa ver apenas RFCs ou apenas tickets de suporte.

---

## Arquivos a modificar

### 1. `src/components/tickets/TicketRow.tsx`

Único ponto de renderização das linhas — alteração se aplica automaticamente a `/tickets` e `/meus-tickets`.

**Mudança:** Na `TableCell` do título, adicionar o badge `RFC` antes do texto quando `ticket.record_type === 'rfc'`:

```tsx
<TableCell className="max-w-md">
  <div className="flex items-center gap-2">
    {ticket.record_type === 'rfc' && (
      <Badge
        variant="outline"
        className="border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-500 dark:bg-violet-950 dark:text-violet-300 shrink-0 font-bold text-xs"
      >
        RFC
      </Badge>
    )}
    <span className="truncate">{ticket.title}</span>
  </div>
</TableCell>
```

O `truncate` é movido para o `<span>` interno em vez da célula, para não cortar o badge.

### 2. `src/pages/Tickets.tsx`

Adicionar filtro por tipo de registro:

**Estado:**
```typescript
const [typeFilter, setTypeFilter] = useState<string>("all");
```

**No filtro `filteredTickets`:**
```typescript
const matchesType = typeFilter === "all" || ticket.record_type === typeFilter;
return matchesSearch && matchesStatus && matchesSegment && matchesClient && matchesTeam && matchesQueue && matchesType;
```

**No JSX dos filtros** (ao lado do filtro de Segmento):
```tsx
<Select value={typeFilter} onValueChange={setTypeFilter}>
  <SelectTrigger className="w-[160px]">
    <SelectValue placeholder="Tipo" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todos os tipos</SelectItem>
    <SelectItem value="ticket">Suporte</SelectItem>
    <SelectItem value="rfc">RFC</SelectItem>
  </SelectContent>
</Select>
```

### 3. `src/pages/MyTickets.tsx`

Mesma adição de filtro por tipo — idêntica à de `Tickets.tsx`.

---

## O que NÃO muda

- Número de colunas da tabela
- Headers da tabela
- Queries de dados (o campo `record_type` já é retornado pelo `SELECT *`)
- Componentes de ações em massa
- RLS e permissões
- Qualquer outra página do sistema

---

## Sequência de Implementação

```text
1. TicketRow.tsx
   └─ Badge RFC inline na coluna Título

2. Tickets.tsx
   └─ Estado typeFilter
   └─ Lógica de filtro matchesType
   └─ Select de tipo no painel de filtros

3. MyTickets.tsx
   └─ Mesmas alterações de Tickets.tsx
```
