
## Atualizar NewTicketDialog e FAQArticleDialog para Segmentos Dinâmicos

Este plano atualiza ambos os componentes para buscar segmentos da tabela `segments` ao invés de usar valores hardcoded.

---

### Visão Geral das Alterações

Ambos os componentes atualmente usam:
- **Zod schema**: `z.enum(["DB", "APP"])`
- **TypeScript**: `"DB" | "APP"`
- **Select**: Opções fixas com texto hardcoded

Serão alterados para:
- **Zod schema**: `z.string().min(1, "Selecione um segmento")`
- **TypeScript**: `string | null`
- **Select**: Opções dinâmicas usando `useActiveSegments()`

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/tickets/NewTicketDialog.tsx` | Hook, schema, state, Select dinâmico |
| `src/components/faq/FAQArticleDialog.tsx` | Hook, schema, Select dinâmico |

---

### 1. Alterações no NewTicketDialog.tsx

#### 1.1 Adicionar Import do Hook
```typescript
import { useActiveSegments } from "@/hooks/useSegments";
```

#### 1.2 Atualizar Zod Schema (linha 33)
```typescript
// De:
segment: z.enum(["DB", "APP"]),

// Para:
segment: z.string().min(1, "Selecione um segmento"),
```

#### 1.3 Atualizar State (linha 88)
```typescript
// De:
const [segment, setSegment] = useState<"DB" | "APP" | null>(null);

// Para:
const [segment, setSegment] = useState<string | null>(null);
```

#### 1.4 Adicionar Query de Segmentos
```typescript
const { data: allSegments } = useActiveSegments();
```

#### 1.5 Atualizar Lógica de availableSegments (linhas 154-156)
```typescript
// Filtrar segmentos ativos que estão disponíveis para o cliente
const clientSegmentCodes = effectiveClientData?.segments || currentTenant?.segments || [];
const availableSegments = allSegments?.filter(s => clientSegmentCodes.includes(s.code)) || [];
const hasOnlyOneSegment = availableSegments.length === 1;
```

#### 1.6 Atualizar Select de Segmentos (linhas 597-614)
```tsx
<Select value={segment || ""} onValueChange={handleSegmentChange}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione o segmento" />
  </SelectTrigger>
  <SelectContent>
    {availableSegments?.map((seg) => (
      <SelectItem key={seg.id} value={seg.code}>
        {seg.display_name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### 1.7 Atualizar handleSegmentChange (linha 561)
```typescript
const handleSegmentChange = (value: string) => {
  setSegment(value);
  setValue("segment", value);
  setValue("category", "");
  setValue("subcategory", "");
};
```

#### 1.8 Atualizar Display de Segmento Único (linhas 584-596)
```tsx
{hasOnlyOneSegment ? (
  <div className="space-y-2">
    <Label>Segmento *</Label>
    <div className="flex items-center gap-2">
      <Input 
        value={availableSegments[0]?.display_name || ""}
        disabled
        className="bg-muted cursor-not-allowed"
      />
      <p className="text-xs text-muted-foreground">
        (Segmento único disponível)
      </p>
    </div>
  </div>
) : (
  // ... Select dinâmico
)}
```

---

### 2. Alterações no FAQArticleDialog.tsx

#### 2.1 Adicionar Import do Hook
```typescript
import { useActiveSegments } from "@/hooks/useSegments";
```

#### 2.2 Atualizar Zod Schema (linha 146)
```typescript
// De:
segment: z.enum(["DB", "APP"]),

// Para:
segment: z.string().min(1, "Selecione um segmento"),
```

#### 2.3 Adicionar Query de Segmentos
```typescript
const { data: allSegments } = useActiveSegments();
```

#### 2.4 Atualizar Select de Segmentos (linhas 560-588)
```tsx
<FormField
  control={form.control}
  name="segment"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Segmento *</FormLabel>
      <Select 
        onValueChange={(value) => {
          field.onChange(value);
          form.setValue("db_engines", []);
          form.setValue("app_product_ids", []);
        }} 
        value={field.value}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o segmento" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {allSegments?.map((seg) => (
            <SelectItem key={seg.id} value={seg.code}>
              {seg.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

### 3. Considerações de Compatibilidade

Como o enum `ticket_segment` ainda existe no PostgreSQL para as colunas `tickets.segment` e `faq_articles.segment`, a migração para TEXT dessas colunas será necessária na **Fase 2** do plano original.

Por enquanto, as alterações acima funcionarão com os segmentos existentes ('DB' e 'APP') porque:
1. A tabela `segments` já contém esses códigos
2. O valor salvo no banco continua sendo 'DB' ou 'APP' (que o enum aceita)

Quando novos segmentos forem adicionados (ex: 'INFRA'), será necessário:
1. Alterar `tickets.segment` de enum para TEXT
2. Alterar `faq_articles.segment` de enum para TEXT

---

### 4. Resumo das Alterações

**NewTicketDialog.tsx**:
- Linha 4: Adicionar import de `useActiveSegments`
- Linha 33: Alterar Zod para `z.string().min(1)`
- Linha 88: Alterar state para `string | null`
- Linha ~130: Adicionar query `useActiveSegments()`
- Linhas 154-156: Atualizar lógica de filtro de segmentos
- Linhas 561-566: Atualizar `handleSegmentChange`
- Linhas 584-614: Atualizar UI de seleção de segmento

**FAQArticleDialog.tsx**:
- Linha 8: Adicionar import de `useActiveSegments`
- Linha 146: Alterar Zod para `z.string().min(1)`
- Linha ~200: Adicionar query `useActiveSegments()`
- Linhas 560-588: Atualizar Select de segmento
