import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, MoreHorizontal, ToggleLeft, ToggleRight, Trash2, Pencil, X } from "lucide-react";

export interface TicketSubcategory {
  id: string;
  category_id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const subcategorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Máximo 100 caracteres"),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
});

type SubcategoryFormData = z.infer<typeof subcategorySchema>;

interface SubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
  categoryName: string | null;
}

export default function SubcategoryDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
}: SubcategoryDialogProps) {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const [editingSubcategory, setEditingSubcategory] = useState<TicketSubcategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteSubcategoryId, setDeleteSubcategoryId] = useState<string | null>(null);

  const form = useForm<SubcategoryFormData>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: {
      name: "",
      is_active: true,
      sort_order: 0,
    },
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = form;

  // Fetch subcategories for this category
  const { data: subcategories, isLoading } = useQuery({
    queryKey: ["ticket_subcategories", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data, error } = await supabase
        .from("ticket_subcategories")
        .select("*")
        .eq("category_id", categoryId)
        .order("sort_order");
      if (error) throw error;
      return data as TicketSubcategory[];
    },
    enabled: !!categoryId && open,
  });

  // Reset form when editing subcategory changes
  useEffect(() => {
    if (editingSubcategory) {
      reset({
        name: editingSubcategory.name,
        is_active: editingSubcategory.is_active,
        sort_order: editingSubcategory.sort_order,
      });
      setShowForm(true);
    } else {
      reset({
        name: "",
        is_active: true,
        sort_order: subcategories?.length || 0,
      });
    }
  }, [editingSubcategory, reset, subcategories?.length]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: SubcategoryFormData) => {
      const { error } = await supabase.from("ticket_subcategories").insert({
        tenant_id: tenantId,
        category_id: categoryId,
        name: data.name,
        is_active: data.is_active,
        sort_order: data.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket_subcategories", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["ticket_categories_with_counts"] });
      toast.success("Subcategoria criada com sucesso");
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro ao criar subcategoria: " + error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: SubcategoryFormData & { id: string }) => {
      const { error } = await supabase
        .from("ticket_subcategories")
        .update({
          name: data.name,
          is_active: data.is_active,
          sort_order: data.sort_order,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket_subcategories", categoryId] });
      toast.success("Subcategoria atualizada");
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Toggle active status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ticket_subcategories")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket_subcategories", categoryId] });
      toast.success("Status atualizado");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ticket_subcategories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket_subcategories", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["ticket_categories_with_counts"] });
      toast.success("Subcategoria removida");
      setDeleteSubcategoryId(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  const resetForm = () => {
    setEditingSubcategory(null);
    setShowForm(false);
    reset({
      name: "",
      is_active: true,
      sort_order: subcategories?.length || 0,
    });
  };

  const onSubmit = (data: SubcategoryFormData) => {
    if (editingSubcategory) {
      updateMutation.mutate({ ...data, id: editingSubcategory.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Subcategorias de "{categoryName}"
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Add/Edit Form */}
            {showForm ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {editingSubcategory ? "Editar Subcategoria" : "Nova Subcategoria"}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={resetForm}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="Nome da subcategoria"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sort_order">Ordem</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      {...register("sort_order", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={watch("is_active")}
                      onCheckedChange={(checked) => setValue("is_active", checked)}
                    />
                    <Label htmlFor="is_active">Ativo</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingSubcategory ? "Salvar" : "Criar"}
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Subcategoria
              </Button>
            )}

            {/* Subcategories List */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : subcategories?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhuma subcategoria cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    subcategories?.map((subcategory) => (
                      <TableRow key={subcategory.id}>
                        <TableCell className="font-medium">{subcategory.name}</TableCell>
                        <TableCell>
                          <Badge variant={subcategory.is_active ? "default" : "secondary"}>
                            {subcategory.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setEditingSubcategory(subcategory)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => toggleMutation.mutate({
                                  id: subcategory.id,
                                  is_active: !subcategory.is_active,
                                })}
                              >
                                {subcategory.is_active ? (
                                  <>
                                    <ToggleLeft className="h-4 w-4 mr-2" />
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="h-4 w-4 mr-2" />
                                    Ativar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteSubcategoryId(subcategory.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSubcategoryId} onOpenChange={() => setDeleteSubcategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Subcategoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta subcategoria? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSubcategoryId && deleteMutation.mutate(deleteSubcategoryId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
