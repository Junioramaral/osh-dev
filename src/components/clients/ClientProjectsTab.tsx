import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, FolderKanban, Save, X } from "lucide-react";
import { useClientProjects, useCreateClientProject, useUpdateClientProject, useDeleteClientProject, ClientProject } from "@/hooks/useClientProjects";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClientProjectsTabProps {
  clientId: string | undefined;
  mode: "create" | "edit";
}

export default function ClientProjectsTab({ clientId, mode }: ClientProjectsTabProps) {
  const { data: projects, isLoading } = useClientProjects(clientId);
  const createProject = useCreateClientProject();
  const updateProject = useUpdateClientProject();
  const deleteProject = useDeleteClientProject();

  const [showNewForm, setShowNewForm] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({ name: "", description: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ClientProject | null>(null);

  if (mode === "create") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Projetos</h3>
        <p className="text-muted-foreground max-w-sm">
          Salve o cliente primeiro para poder adicionar projetos.
        </p>
      </div>
    );
  }

  const handleAddProject = async () => {
    if (!clientId || !newProject.name.trim()) return;
    await createProject.mutateAsync({
      client_id: clientId,
      name: newProject.name.trim(),
      description: newProject.description.trim() || undefined,
      is_active: true,
    });
    setNewProject({ name: "", description: "" });
    setShowNewForm(false);
  };

  const handleUpdateProject = async (project: ClientProject) => {
    if (!clientId || !editingData.name.trim()) return;
    await updateProject.mutateAsync({
      id: project.id,
      client_id: clientId,
      name: editingData.name.trim(),
      description: editingData.description.trim() || undefined,
    });
    setEditingId(null);
  };

  const handleToggleActive = async (project: ClientProject) => {
    if (!clientId) return;
    await updateProject.mutateAsync({
      id: project.id,
      client_id: clientId,
      is_active: !project.is_active,
    });
  };

  const handleDeleteProject = async () => {
    if (!clientId || !projectToDelete) return;
    await deleteProject.mutateAsync({ id: projectToDelete.id, client_id: clientId });
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const startEdit = (project: ClientProject) => {
    setEditingId(project.id);
    setEditingData({ name: project.name, description: project.description || "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({ name: "", description: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Projetos</h3>
        {!showNewForm && (
          <Button size="sm" onClick={() => setShowNewForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        )}
      </div>

      {/* Formulário para novo projeto */}
      {showNewForm && (
        <Card className="border-primary/50">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-project-name">Nome *</Label>
              <Input
                id="new-project-name"
                placeholder="Nome do projeto"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-project-description">Descrição</Label>
              <Textarea
                id="new-project-description"
                placeholder="Descrição do projeto (opcional)"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowNewForm(false); setNewProject({ name: "", description: "" }); }}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleAddProject} disabled={!newProject.name.trim() || createProject.isPending}>
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de projetos */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="space-y-3">
          {projects.map((project) => (
            <Card key={project.id} className={!project.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                {editingId === project.id ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        value={editingData.name}
                        onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={editingData.description}
                        onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={() => handleUpdateProject(project)} disabled={!editingData.name.trim() || updateProject.isPending}>
                        <Save className="h-4 w-4 mr-1" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-primary flex-shrink-0" />
                        <h4 className="font-medium truncate">{project.name}</h4>
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={project.is_active}
                          onCheckedChange={() => handleToggleActive(project)}
                          disabled={updateProject.isPending}
                        />
                        <span className="text-sm text-muted-foreground">
                          {project.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(project)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => { setProjectToDelete(project); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg bg-muted/20">
          <FolderKanban className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum projeto cadastrado</p>
          <p className="text-sm text-muted-foreground">Clique em "Novo Projeto" para adicionar</p>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o projeto "{projectToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
