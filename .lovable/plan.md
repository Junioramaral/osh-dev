
## Tornar Segmentos Configuraveis via Banco de Dados

Este plano implementa segmentos dinamicos atraves de uma nova tabela `segments`, permitindo gerenciamento via interface de Configuracoes similar ao padrao de `database_engines` e `application_products`.

---

### Analise de Impacto

Atualmente, os segmentos "DB" e "APP" estao definidos como:
- **Enum PostgreSQL**: `ticket_segment` com valores fixos `('DB', 'APP')`
- **TypeScript Types**: Hardcoded em `src/integrations/supabase/types.ts`
- **Zod Schemas**: Validacoes hardcoded em 5+ componentes
- **Logica de Negocio**: Condicoes `if (segment === 'DB')` em 15+ arquivos

Tabelas que usam o enum `ticket_segment`:
- `tickets.segment`
- `teams.segment`
- `faq_articles.segment`
- `ticket_categories.segment`

---

### Estrategia de Implementacao

Dado o alto acoplamento do enum existente, a implementacao sera feita em duas fases:

**Fase 1 (Este Plano)**: Criar tabela `segments` e interface CRUD, mantendo compatibilidade com enum existente

**Fase 2 (Futuro)**: Migrar tabelas para usar `segment_id` (FK) ao inves do enum

---

### Fase 1: Tabela e CRUD de Segmentos

#### 1. Migracao de Banco de Dados

Criar tabela `segments`:

```sql
CREATE TABLE public.segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,     -- 'DB', 'APP', 'INFRA', etc.
  display_name TEXT NOT NULL,    -- 'Banco de Dados', 'Aplicacao', etc.
  description TEXT,
  icon TEXT,                     -- Nome do icone Lucide
  color TEXT,                    -- Cor para badges (ex: 'blue', 'green')
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_segments_updated_at
BEFORE UPDATE ON public.segments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active segments"
ON public.segments FOR SELECT
USING (is_active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage segments"
ON public.segments FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Dados iniciais
INSERT INTO public.segments (code, display_name, description, icon, color, sort_order)
VALUES 
  ('DB', 'Banco de Dados', 'Suporte a bancos de dados', 'Database', 'blue', 1),
  ('APP', 'Aplicacao', 'Suporte a aplicacoes', 'Package', 'green', 2);
```

---

#### 2. Criar Componente SegmentDialog

Novo arquivo: `src/components/settings/SegmentDialog.tsx`

Campos do formulario:
- **Codigo** (code): Texto unico, uppercase (ex: DB, APP, INFRA)
- **Nome de Exibicao** (display_name): Texto para UI
- **Descricao**: Opcional
- **Icone**: Select com opcoes (Database, Package, Server, Cloud, etc.)
- **Cor**: Select com cores disponiveis
- **Ativo**: Switch

Validacao Zod:
```typescript
const segmentSchema = z.object({
  code: z.string()
    .min(2, "Codigo deve ter pelo menos 2 caracteres")
    .max(10, "Codigo muito longo")
    .regex(/^[A-Z0-9_]+$/, "Use apenas letras maiusculas, numeros e underscore"),
  display_name: z.string().min(1, "Nome e obrigatorio").max(50),
  description: z.string().max(200).optional(),
  icon: z.string().default("Layers"),
  color: z.string().default("gray"),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
});
```

---

#### 3. Modificar SystemSettings.tsx

Adicionar nova aba "Segmentos" no TabsList:

```text
+------------------------------------------------------------------+
| Geral | Engines | Produtos | Filas | Categorias | Times | Segmentos |
+------------------------------------------------------------------+
                                                            ^^ NOVA
```

Conteudo da aba:
- Tabela com colunas: Codigo, Nome, Icone, Cor, Status, Acoes
- Botao "Novo Segmento" (apenas para super_admin)
- Menu de acoes: Ativar/Desativar, Remover

**Protecao**: Segmentos 'DB' e 'APP' nao podem ser removidos enquanto existirem registros nas tabelas dependentes.

---

#### 4. Atualizar Componentes para Usar Dados Dinamicos

Os componentes abaixo serao atualizados para buscar segmentos da tabela ao inves de usar valores hardcoded:

| Componente | Alteracao |
|------------|-----------|
| `TeamDialog.tsx` | Select busca segmentos ativos |
| `CategoryDialog.tsx` | Select busca segmentos ativos + "Ambos" |
| `NewTicketDialog.tsx` | Select busca segmentos do cliente |
| `FAQArticleDialog.tsx` | Select busca segmentos ativos |
| `Tickets.tsx` | Filtro busca segmentos ativos |
| `MyTickets.tsx` | Filtro busca segmentos ativos |
| `FAQ.tsx` | Filtro busca segmentos ativos |
| `SLADashboard.tsx` | Filtro busca segmentos ativos |
| `QueueWorkloadReport.tsx` | Filtro busca segmentos ativos |
| `CategoriesReport.tsx` | Filtro busca segmentos ativos |

---

#### 5. Hook Reutilizavel para Segmentos

Novo arquivo: `src/hooks/useSegments.ts`

```typescript
export function useSegments() {
  return useQuery({
    queryKey: ["segments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("segments")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useActiveSegments() {
  return useQuery({
    queryKey: ["segments", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("segments")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}
```

---

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/settings/SegmentDialog.tsx` | Dialog CRUD para segmentos |
| `src/hooks/useSegments.ts` | Hooks para buscar segmentos |

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/SystemSettings.tsx` | Adicionar aba Segmentos com tabela e CRUD |
| `src/components/settings/TeamDialog.tsx` | Trocar enum por fetch dinamico |
| `src/components/settings/CategoryDialog.tsx` | Trocar enum por fetch dinamico |
| `src/components/tickets/NewTicketDialog.tsx` | Trocar enum por fetch dinamico |
| `src/components/faq/FAQArticleDialog.tsx` | Trocar enum por fetch dinamico |
| `src/pages/Tickets.tsx` | Filtro dinamico de segmentos |
| `src/pages/MyTickets.tsx` | Filtro dinamico de segmentos |
| `src/pages/FAQ.tsx` | Filtro dinamico de segmentos |
| `src/pages/SLADashboard.tsx` | Filtro dinamico de segmentos |
| `src/components/reports/QueueWorkloadReport.tsx` | Filtro dinamico |
| `src/components/reports/CategoriesReport.tsx` | Filtro dinamico |

---

### Banco de Dados

**Migracao necessaria**:
1. Criar tabela `segments`
2. Adicionar RLS policies
3. Inserir dados iniciais (DB, APP)

**Nota**: O enum `ticket_segment` sera mantido nesta fase para compatibilidade. A Fase 2 (futura) migrara as tabelas para usar `segment_id` (FK).

---

### Restricoes de Seguranca

1. **Codigo unico**: Nao permitir codigos duplicados
2. **Protecao contra exclusao**: Segmentos com registros associados nao podem ser removidos
3. **Apenas super_admin**: Somente super admins podem gerenciar segmentos
4. **Viewer mode**: Auditores podem visualizar mas nao editar

---

### Fluxo de Usuario

```text
Super Admin acessa Configuracoes > Segmentos
                |
                v
     +-------------------+
     | Lista de Segmentos|
     | [+ Novo Segmento] |
     +-------------------+
                |
     Clica em Novo Segmento
                |
                v
     +-------------------+
     | Dialog:           |
     | - Codigo: INFRA   |
     | - Nome: Infra...  |
     | - Icone: Server   |
     | - Cor: orange     |
     +-------------------+
                |
     Salva -> Segmento disponivel em todos os formularios
```

---

### Consideracoes para Fase 2 (Futura)

Quando for necessario migrar completamente para o modelo relacional:

1. Adicionar coluna `segment_id` (uuid FK) nas tabelas
2. Migrar dados existentes para a nova coluna
3. Atualizar funcoes `calculate_sla_deadlines` para modelo dinamico
4. Atualizar triggers e logica de negocio
5. Remover coluna `segment` (enum) apos migracao completa
6. Deprecar e remover o enum `ticket_segment`

Esta abordagem em fases permite adicionar novos segmentos via interface sem modificar o schema existente, enquanto mantemos compatibilidade total com o codigo atual.
