

# Plano: Adicionar Aba de Projetos na Tela de Clientes

## Resumo

Adicionar uma nova aba **"Projetos"** no dialog de clientes, junto com as abas existentes (Informacoes Basicas, Contrato, SLAs). Cada projeto tera nome, descricao e um toggle para indicar se esta ativo ou nao.

---

## Estrutura Proposta

### Antes (3 abas)
```text
┌────────────────────┬──────────┬───────┐
│ Informacoes Basicas│ Contrato │ SLAs  │
└────────────────────┴──────────┴───────┘
```

### Depois (4 abas)
```text
┌────────────────────┬──────────┬───────┬──────────┐
│ Informacoes Basicas│ Contrato │ SLAs  │ Projetos │
└────────────────────┴──────────┴───────┴──────────┘
```

---

## 1. Nova Tabela no Banco de Dados

Criar tabela `client_projects` com a seguinte estrutura:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| client_id | uuid | FK para clients |
| name | text | Nome do projeto (obrigatorio) |
| description | text | Descricao do projeto (opcional) |
| is_active | boolean | Se o projeto esta ativo (default: true) |
| created_at | timestamp | Data de criacao |
| updated_at | timestamp | Data de atualizacao |

### SQL da Migration

```sql
-- Criar tabela de projetos do cliente
CREATE TABLE IF NOT EXISTS public.client_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indices
CREATE INDEX idx_client_projects_client_id ON public.client_projects(client_id);

-- RLS
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

-- Politicas RLS (seguindo o padrao de client_contacts)
CREATE POLICY "Client view own projects"
  ON public.client_projects FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND NOT is_super_admin(auth.uid())
    AND NOT is_otimizzo_user(auth.uid())
    AND client_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Otimizzo view projects"
  ON public.client_projects FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_otimizzo_user(auth.uid()));

CREATE POLICY "Super admins manage projects"
  ON public.client_projects FOR ALL
  USING (auth.uid() IS NOT NULL AND is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND is_super_admin(auth.uid()));

CREATE POLICY "Viewers can view all projects"
  ON public.client_projects FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_viewer(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_client_projects_updated_at
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 2. Arquivos a Criar

### `src/hooks/useClientProjects.ts`

Hook para gerenciar projetos do cliente:

```typescript
// Query para buscar projetos do cliente
export const useClientProjects = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ["client-projects", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_projects")
        .select("*")
        .eq("client_id", clientId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
};

// Mutations para criar, atualizar e excluir projetos
export const useCreateProject = () => { ... };
export const useUpdateProject = () => { ... };
export const useDeleteProject = () => { ... };
```

---

## 3. Arquivos a Modificar

### `src/components/clients/ClientDialog.tsx`

| Alteracao | Descricao |
|-----------|-----------|
| TabsList | Mudar de `grid-cols-3` para `grid-cols-4` |
| Novo TabsTrigger | Adicionar `value="projects"` com icone `FolderKanban` |
| Novo TabsContent | Adicionar conteudo da aba Projetos |

---

## 4. Interface da Aba Projetos

```text
┌─────────────────────────────────────────────────────────────────┐
│  Projetos                                         [Novo Projeto]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Nome: [________________________]                          │  │
│  │ Descricao: [______________________________________________]│  │
│  │ Ativo: [Toggle ON/OFF]                     [Salvar] [🗑️]  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Nome: Projeto Alpha                                       │  │
│  │ Descricao: Sistema de automacao comercial                 │  │
│  │ Ativo: [Toggle ON]                         [Editar] [🗑️]  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Nome: Projeto Beta                                        │  │
│  │ Descricao: Integracao com ERP                             │  │
│  │ Ativo: [Toggle OFF]                        [Editar] [🗑️]  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Comportamento da Aba Projetos

### Modo Criacao de Cliente
- Aba "Projetos" ficara **desabilitada** com tooltip explicando que e necessario salvar o cliente primeiro
- Apos criar o cliente, podera adicionar projetos abrindo o dialog em modo edicao

### Modo Edicao de Cliente
- Lista todos os projetos vinculados ao cliente
- Permite adicionar novo projeto (formulario inline ou modal simples)
- Permite editar projetos existentes
- Permite ativar/desativar com toggle
- Permite excluir projeto (com confirmacao)

---

## 6. Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/migrations/...` | Criar | Migration para tabela client_projects |
| `src/hooks/useClientProjects.ts` | Criar | Hook com queries e mutations |
| `src/components/clients/ClientDialog.tsx` | Modificar | Adicionar aba Projetos |

---

## 7. Detalhes Tecnicos

### Icone para a Aba
```typescript
import { FolderKanban } from "lucide-react";

<TabsTrigger value="projects" disabled={mode === "create"}>
  <FolderKanban className="h-4 w-4 mr-1" />
  Projetos
</TabsTrigger>
```

### Formulario Inline para Novo Projeto
```typescript
// Estado local para novo projeto
const [newProject, setNewProject] = useState({ name: "", description: "" });
const [showNewForm, setShowNewForm] = useState(false);

// Ao salvar
const handleAddProject = async () => {
  await createProject.mutateAsync({
    client_id: client.id,
    name: newProject.name,
    description: newProject.description,
    is_active: true,
  });
  setNewProject({ name: "", description: "" });
  setShowNewForm(false);
};
```

### Toggle de Status
```typescript
<Switch
  checked={project.is_active}
  onCheckedChange={(checked) => {
    updateProject.mutate({
      id: project.id,
      is_active: checked,
    });
  }}
/>
```

---

## 8. Regras de Acesso

| Role | Ver | Criar | Editar | Excluir |
|------|-----|-------|--------|---------|
| Super Admin | Sim | Sim | Sim | Sim |
| Tenant Admin | Sim | Sim | Sim | Sim |
| Otimizzo Analyst | Sim | Nao | Nao | Nao |
| Viewer | Sim | Nao | Nao | Nao |
| Cliente | Sim (proprio) | Nao | Nao | Nao |

---

## Resultado Final

Ao abrir um cliente para edicao, o usuario vera 4 abas:
1. **Informacoes Basicas** - Dados gerais do cliente
2. **Contrato** - Usuarios, datas, relatorio mensal
3. **SLAs** - Tempos de SLA por prioridade
4. **Projetos** - Lista de projetos com nome, descricao e status ativo

