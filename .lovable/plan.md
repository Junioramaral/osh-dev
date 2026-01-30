

# Plano: Adicionar Campo "Hora-Extra" nos Projetos

## Objetivo

Adicionar um campo booleano que indica se o projeto e de hora-extra (executado fora do horario comercial). Esse campo sera utilizado posteriormente nos lancamentos de horas pelos analistas.

---

## 1. Alteracao no Banco de Dados

Adicionar a coluna `is_overtime` na tabela `client_projects`:

```sql
ALTER TABLE public.client_projects 
ADD COLUMN is_overtime boolean DEFAULT false;

COMMENT ON COLUMN public.client_projects.is_overtime IS 
'Indica se o projeto deve ser executado fora do horario comercial (hora-extra)';
```

---

## 2. Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useClientProjects.ts` | Adicionar `is_overtime` na interface e mutations |
| `src/components/clients/ClientProjectsTab.tsx` | Adicionar checkbox no formulario e exibicao na lista |

---

## 3. Interface do Usuario

### Formulario de Novo Projeto

```text
┌─────────────────────────────────────────────────────────────────┐
│  Nome *                                                         │
│  [____________________________]                                 │
│                                                                 │
│  Descricao                                                      │
│  [____________________________]                                 │
│                                                                 │
│  [✓] Projeto de Hora-Extra                                      │
│      Executado fora do horario comercial                        │
│                                                                 │
│                              [Cancelar] [Salvar]                │
└─────────────────────────────────────────────────────────────────┘
```

### Card do Projeto na Lista

```text
┌─────────────────────────────────────────────────────────────────┐
│  📁 Projeto Alpha                           ⏰ Hora-Extra       │
│  Descricao do projeto                                           │
│                                    [Ativo ●]  [✏️] [🗑️]         │
└─────────────────────────────────────────────────────────────────┘
```

O badge "Hora-Extra" aparece com icone de relogio (Clock) quando `is_overtime = true`.

---

## 4. Detalhes da Implementacao

### 4.1 Hook (`useClientProjects.ts`)

```typescript
export interface ClientProject {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_overtime: boolean;  // NOVO
  created_at: string;
  updated_at: string;
}

// Mutation de create
mutationFn: async (project: { 
  client_id: string; 
  name: string; 
  description?: string; 
  is_active?: boolean;
  is_overtime?: boolean;  // NOVO
})
```

### 4.2 Componente (`ClientProjectsTab.tsx`)

**Estado para novo projeto:**
```typescript
const [newProject, setNewProject] = useState({ 
  name: "", 
  description: "", 
  is_overtime: false  // NOVO
});
```

**Checkbox no formulario:**
```typescript
import { Checkbox } from "@/components/ui/checkbox";
import { Clock } from "lucide-react";

<div className="flex items-start space-x-3">
  <Checkbox
    id="new-project-overtime"
    checked={newProject.is_overtime}
    onCheckedChange={(checked) => 
      setNewProject({ ...newProject, is_overtime: checked === true })
    }
  />
  <div className="grid gap-1.5 leading-none">
    <Label htmlFor="new-project-overtime" className="flex items-center gap-2">
      <Clock className="h-4 w-4" />
      Projeto de Hora-Extra
    </Label>
    <p className="text-sm text-muted-foreground">
      Executado fora do horario comercial
    </p>
  </div>
</div>
```

**Badge na lista de projetos:**
```typescript
import { Badge } from "@/components/ui/badge";

{project.is_overtime && (
  <Badge variant="outline" className="gap-1 text-xs">
    <Clock className="h-3 w-3" />
    Hora-Extra
  </Badge>
)}
```

---

## 5. Uso Futuro

O campo `is_overtime` sera utilizado nos lancamentos de horas para:
- Filtrar projetos disponiveis por tipo
- Gerar relatorios separados de horas normais vs hora-extra
- Aplicar regras de calculo diferenciadas

---

## 6. Resultado Visual

### Card Normal
```text
┌────────────────────────────────────────────────────────────┐
│  📁 Projeto Alpha                                          │
│  Sistema de gestao                    [Ativo ●] [✏️] [🗑️]  │
└────────────────────────────────────────────────────────────┘
```

### Card Hora-Extra
```text
┌────────────────────────────────────────────────────────────┐
│  📁 Projeto Beta        [⏰ Hora-Extra]                     │
│  Suporte emergencial              [Ativo ●] [✏️] [🗑️]      │
└────────────────────────────────────────────────────────────┘
```

