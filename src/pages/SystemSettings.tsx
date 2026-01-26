import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Package, Plus, Trash2, ToggleLeft, ToggleRight, MoreHorizontal, ListOrdered, Users, Tag, Settings2, Layers, Clock, Save, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DatabaseEngineDialog from "@/components/settings/DatabaseEngineDialog";
import AppProductDialog from "@/components/settings/AppProductDialog";
import QueueDialog, { Queue } from "@/components/settings/QueueDialog";
import TeamQueuesDialog from "@/components/settings/TeamQueuesDialog";
import CategoryDialog, { TicketCategory } from "@/components/settings/CategoryDialog";
import SubcategoryDialog from "@/components/settings/SubcategoryDialog";

interface Team {
  id: string;
  name: string;
  segment: "DB" | "APP";
  specialization: string | null;
}

interface DatabaseEngine {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface AppProduct {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
}

export default function SystemSettings() {
  const { isSuperAdmin, isViewer, loading } = useAuth();
  const queryClient = useQueryClient();

  const [engineDialogOpen, setEngineDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<DatabaseEngine | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<AppProduct | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null);
  const [deleteEngineId, setDeleteEngineId] = useState<string | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteQueueId, setDeleteQueueId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamQueuesDialogOpen, setTeamQueuesDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [selectedCategoryForSubcategories, setSelectedCategoryForSubcategories] = useState<{ id: string; name: string } | null>(null);
  const [inactivityDays, setInactivityDays] = useState<number>(7);
  const [inactivityDaysInput, setInactivityDaysInput] = useState<string>("7");

  // Fetch system configs
  const { data: systemConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ["system_configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_configs")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Set initial inactivity days from config
  useEffect(() => {
    if (systemConfigs) {
      const inactivityConfig = systemConfigs.find((c: any) => c.key === 'ticket_inactivity_days');
      if (inactivityConfig) {
        const value = typeof inactivityConfig.value === 'string' 
          ? Number(inactivityConfig.value) 
          : Number(inactivityConfig.value);
        setInactivityDays(value);
        setInactivityDaysInput(String(value));
      }
    }
  }, [systemConfigs]);

  // Save inactivity days config
  const saveInactivityMutation = useMutation({
    mutationFn: async (days: number) => {
      const { error } = await supabase
        .from("system_configs")
        .upsert({ 
          key: 'ticket_inactivity_days', 
          value: String(days),
          updated_at: new Date().toISOString() 
        }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_configs"] });
      toast.success("Configuração salva com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const handleSaveInactivityDays = () => {
    const days = Number(inactivityDaysInput);
    if (isNaN(days) || days < 1 || days > 30) {
      toast.error("O valor deve ser entre 1 e 30 dias");
      return;
    }
    setInactivityDays(days);
    saveInactivityMutation.mutate(days);
  };

  // Fetch database engines
  const { data: engines, isLoading: enginesLoading } = useQuery({
    queryKey: ["database_engines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("database_engines")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as DatabaseEngine[];
    },
  });

  // Fetch application products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["application_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_products")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as AppProduct[];
    },
  });

  // Fetch queues
  const { data: queues, isLoading: queuesLoading } = useQuery({
    queryKey: ["queues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queues")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Queue[];
    },
  });

  // Fetch ticket categories with subcategory counts
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["ticket_categories_with_counts"],
    queryFn: async () => {
      const { data: categoriesData, error } = await supabase
        .from("ticket_categories")
        .select("*")
        .order("segment")
        .order("sort_order");
      if (error) throw error;

      // Get subcategory counts for each category
      const categoriesWithCounts = await Promise.all(
        (categoriesData as TicketCategory[]).map(async (category) => {
          const { count, error: countError } = await supabase
            .from("ticket_subcategories")
            .select("*", { count: "exact", head: true })
            .eq("category_id", category.id);
          return {
            ...category,
            subcategoryCount: count || 0,
          };
        })
      );
      return categoriesWithCounts as (TicketCategory & { subcategoryCount: number })[];
    },
  });

  // Fetch teams with queue count
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["teams-with-queues"],
    queryFn: async () => {
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, segment, specialization")
        .order("name");
      if (teamsError) throw teamsError;

      // Get queue counts for each team
      const teamsWithCounts = await Promise.all(
        teamsData.map(async (team) => {
          const { count, error } = await supabase
            .from("teams_queues")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);
          return {
            ...team,
            queueCount: count || 0,
          };
        })
      );
      return teamsWithCounts as (Team & { queueCount: number })[];
    },
  });

  // Toggle engine active status
  const toggleEngineMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("database_engines")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["database_engines"] });
      toast.success("Status atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Toggle product active status
  const toggleProductMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("application_products")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application_products"] });
      toast.success("Status atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Delete engine
  const deleteEngineMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("database_engines")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["database_engines"] });
      toast.success("Engine removido");
      setDeleteEngineId(null);
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  // Delete product
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("application_products")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application_products"] });
      toast.success("Produto removido");
      setDeleteProductId(null);
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  // Toggle queue active status
  const toggleQueueMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("queues")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      toast.success("Status atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Delete queue
  const deleteQueueMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("queues")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      toast.success("Fila removida");
      setDeleteQueueId(null);
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  // Toggle category active status
  const toggleCategoryMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ticket_categories")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket_categories"] });
      toast.success("Status atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Delete category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ticket_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket_categories"] });
      toast.success("Categoria removida");
      setDeleteCategoryId(null);
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isSuperAdmin && !isViewer) {
    return <Navigate to="/dashboard" replace />;
  }

  const isReadOnly = isViewer;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
          <p className="text-muted-foreground">Gerencie engines de banco, produtos de aplicação, filas, categorias e times</p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full max-w-5xl grid-cols-6">
            <TabsTrigger value="general" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="engines" className="gap-2">
              <Database className="h-4 w-4" />
              Engines
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="queues" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              Filas
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Tag className="h-4 w-4" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2">
              <Users className="h-4 w-4" />
              Times
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Automação de Tickets Inativos
                </CardTitle>
                <CardDescription>
                  Configure após quantos dias um ticket sem atualizações será 
                  automaticamente desbloqueado e retornará à fila geral.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="inactivity-days">Dias de inatividade:</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="inactivity-days"
                      type="number" 
                      min={1} 
                      max={30}
                      value={inactivityDaysInput}
                      onChange={(e) => setInactivityDaysInput(e.target.value)}
                      className="w-20"
                      disabled={isReadOnly}
                    />
                    <span className="text-muted-foreground">dias</span>
                  </div>
                  {!isReadOnly && (
                    <Button 
                      onClick={handleSaveInactivityDays}
                      disabled={saveInactivityMutation.isPending}
                    >
                      {saveInactivityMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Valor atual: <strong>{inactivityDays} dias</strong>. Tickets sem atualização por este 
                  período terão o analista removido automaticamente.
                  {isReadOnly && <span className="ml-2 text-purple-600">(Somente leitura)</span>}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Engines Tab */}
          <TabsContent value="engines" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Engines de Banco de Dados</h2>
              {!isReadOnly && (
                <Button
                  onClick={() => {
                    setSelectedEngine(null);
                    setEngineDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Engine
                </Button>
              )}
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enginesLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : engines?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum engine cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    engines?.map((engine) => (
                      <TableRow 
                        key={engine.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedEngine(engine);
                          setEngineDialogOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{engine.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {engine.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={engine.is_active ? "default" : "secondary"}>
                            {engine.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleEngineMutation.mutate({ id: engine.id, is_active: !engine.is_active });
                                }}
                              >
                                {engine.is_active ? (
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteEngineId(engine.id);
                                }}
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
          </TabsContent>

          {/* Application Products Tab */}
          <TabsContent value="products" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Produtos de Aplicação</h2>
              <Button
                onClick={() => {
                  setSelectedProduct(null);
                  setProductDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : products?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum produto cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    products?.map((product) => (
                      <TableRow 
                        key={product.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedProduct(product);
                          setProductDialogOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProductMutation.mutate({ id: product.id, is_active: !product.is_active });
                                }}
                              >
                                {product.is_active ? (
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteProductId(product.id);
                                }}
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
          </TabsContent>

          {/* Queues Tab */}
          <TabsContent value="queues" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Filas de Atendimento</h2>
              <Button
                onClick={() => {
                  setSelectedQueue(null);
                  setQueueDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Fila
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queuesLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : queues?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma fila cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    queues?.map((queue) => (
                      <TableRow 
                        key={queue.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedQueue(queue);
                          setQueueDialogOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{queue.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {queue.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={queue.is_active ? "default" : "secondary"}>
                            {queue.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleQueueMutation.mutate({ id: queue.id, is_active: !queue.is_active });
                                }}
                              >
                                {queue.is_active ? (
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteQueueId(queue.id);
                                }}
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
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Categorias de Ticket</h2>
              <Button
                onClick={() => {
                  setSelectedCategory(null);
                  setCategoryDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead className="w-[130px]">Subcategorias</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriesLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : categories?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma categoria cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories?.map((category) => (
                      <TableRow 
                        key={category.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedCategory(category);
                          setCategoryDialogOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          {category.segment === null ? (
                            <Badge variant="outline">Ambos</Badge>
                          ) : category.segment === "DB" ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <Database className="h-3 w-3 mr-1" />
                              DB
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <Package className="h-3 w-3 mr-1" />
                              APP
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {category.subcategoryCount} {category.subcategoryCount === 1 ? "subcategoria" : "subcategorias"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCategoryForSubcategories({ id: category.id, name: category.name });
                                  setSubcategoryDialogOpen(true);
                                }}
                              >
                                <Layers className="h-4 w-4 mr-2" />
                                Subcategorias
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCategoryMutation.mutate({ id: category.id, is_active: !category.is_active });
                                }}
                              >
                                {category.is_active ? (
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteCategoryId(category.id);
                                }}
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
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">Times</h2>
                <p className="text-sm text-muted-foreground">
                  Clique em um time para configurar quais filas ele atende
                </p>
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Especialização</TableHead>
                    <TableHead className="w-[150px]">Filas Atendidas</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : teams?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum time cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    teams?.map((team) => (
                      <TableRow 
                        key={team.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedTeam(team);
                          setTeamQueuesDialogOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>
                          <Badge variant={team.segment === "DB" ? "default" : "secondary"}>
                            {team.segment}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {team.specialization || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {team.queueCount} {team.queueCount === 1 ? "fila" : "filas"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTeam(team);
                              setTeamQueuesDialogOpen(true);
                            }}
                          >
                            <Settings2 className="h-4 w-4 mr-2" />
                            Filas
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Database Engine Dialog */}
      <DatabaseEngineDialog
        open={engineDialogOpen}
        onOpenChange={setEngineDialogOpen}
        engine={selectedEngine}
      />

      {/* App Product Dialog */}
      <AppProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        product={selectedProduct}
      />

      {/* Queue Dialog */}
      <QueueDialog
        open={queueDialogOpen}
        onOpenChange={setQueueDialogOpen}
        queue={selectedQueue}
      />

      {/* Category Dialog */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={selectedCategory}
      />

      {/* Subcategory Dialog */}
      <SubcategoryDialog
        open={subcategoryDialogOpen}
        onOpenChange={(open) => {
          setSubcategoryDialogOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["ticket_categories_with_counts"] });
          }
        }}
        categoryId={selectedCategoryForSubcategories?.id || null}
        categoryName={selectedCategoryForSubcategories?.name || null}
      />

      {/* Team Queues Dialog */}
      <TeamQueuesDialog
        open={teamQueuesDialogOpen}
        onOpenChange={(open) => {
          setTeamQueuesDialogOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["teams-with-queues"] });
          }
        }}
        team={selectedTeam}
      />

      {/* Delete Engine Confirmation */}
      <AlertDialog open={!!deleteEngineId} onOpenChange={() => setDeleteEngineId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Engine</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este engine? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEngineId && deleteEngineMutation.mutate(deleteEngineId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Product Confirmation */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este produto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProductId && deleteProductMutation.mutate(deleteProductId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Queue Confirmation */}
      <AlertDialog open={!!deleteQueueId} onOpenChange={() => setDeleteQueueId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Fila</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta fila? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteQueueId && deleteQueueMutation.mutate(deleteQueueId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta categoria? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCategoryId && deleteCategoryMutation.mutate(deleteCategoryId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
