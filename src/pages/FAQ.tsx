import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Search, AlertCircle, BookOpen, Lock, Building2, Globe } from "lucide-react";
import { toast } from "sonner";
import FAQArticleDialog from "@/components/faq/FAQArticleDialog";
import FAQArticleRow from "@/components/faq/FAQArticleRow";
import { FAQArticleViewDialog } from "@/components/faq/FAQArticleViewDialog";
import { Database } from "@/integrations/supabase/types";

type FAQArticle = Database["public"]["Tables"]["faq_articles"]["Row"] & {
  client?: { name: string } | null;
  author?: { full_name: string } | null;
};

export default function FAQ() {
  const { isSuperAdmin, hasRole, isOtimizzoUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<FAQArticle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<FAQArticle | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingArticle, setViewingArticle] = useState<FAQArticle | null>(null);

  const canManageArticles = isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_db') || hasRole('analyst_app');
  const canSeeAllFilters = isSuperAdmin || isOtimizzoUser;

  // Load articles with relations
  const { data: articles, isLoading } = useQuery({
    queryKey: ["faq-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_articles")
        .select(`
          *,
          client:clients(name),
          author:profiles!faq_articles_created_by_fkey(full_name)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as FAQArticle[];
    },
  });

  // Load clients for filter
  const { data: clients } = useQuery({
    queryKey: ["clients-for-faq-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: canSeeAllFilters,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faq_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Artigo excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["faq-articles"] });
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
    },
    onError: (error) => {
      toast.error("Erro ao excluir artigo: " + error.message);
    },
  });

  // Filter articles
  const filteredArticles = articles?.filter((article) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (article.faq_number && article.faq_number.toLowerCase().includes(searchLower)) ||
      article.title.toLowerCase().includes(searchLower) ||
      (article.symptoms && article.symptoms.toLowerCase().includes(searchLower)) ||
      (article.problem && article.problem.toLowerCase().includes(searchLower)) ||
      (article.solution && article.solution.toLowerCase().includes(searchLower)) ||
      (article.keywords &&
        article.keywords.some((k: string) =>
          k.toLowerCase().includes(searchLower)
        ));
    
    const matchesSegment = segmentFilter === "all" || article.segment === segmentFilter;
    const matchesVisibility = visibilityFilter === "all" || article.visibility === visibilityFilter;
    const matchesStatus = statusFilter === "all" || article.status === statusFilter;
    const matchesClient = clientFilter === "all" || article.client_id === clientFilter;
    
    return matchesSearch && matchesSegment && matchesVisibility && matchesStatus && matchesClient;
  });

  const handleView = (article: FAQArticle) => {
    setViewingArticle(article);
    setViewDialogOpen(true);
  };

  const handleEdit = (article: FAQArticle) => {
    setEditingArticle(article);
    setDialogOpen(true);
  };

  const handleEditFromView = (article: FAQArticle) => {
    setViewDialogOpen(false);
    setEditingArticle(article);
    setDialogOpen(true);
  };

  const handleDelete = (article: FAQArticle) => {
    setArticleToDelete(article);
    setDeleteDialogOpen(true);
  };

  const handleNewArticle = () => {
    setEditingArticle(null);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              Base de Conhecimento
            </h1>
            <p className="text-muted-foreground">
              Artigos e documentação técnica
            </p>
          </div>
          {canManageArticles && (
            <Button onClick={handleNewArticle}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Artigo
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar artigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {canSeeAllFilters && (
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Visibilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Visibilidades</SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-red-500" />
                    Interno
                  </div>
                </SelectItem>
                <SelectItem value="client_specific">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-green-500" />
                    Cliente
                  </div>
                </SelectItem>
                <SelectItem value="global">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-blue-500" />
                    Todos
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {canSeeAllFilters && visibilityFilter === "client_specific" && (
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Clientes</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Segmentos</SelectItem>
              <SelectItem value="DB">Banco de Dados</SelectItem>
              <SelectItem value="APP">Aplicação</SelectItem>
            </SelectContent>
          </Select>

          {canSeeAllFilters && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="publicado">Publicado</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Legend */}
        {canSeeAllFilters && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Legenda:</span>
            <div className="flex items-center gap-1.5">
              <Badge className="bg-red-500/10 text-red-600 border-red-500/30">
                <Lock className="h-3 w-3 mr-1" />
                Interno
              </Badge>
              <span className="text-muted-foreground text-xs">Apenas Otimizzo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                <Building2 className="h-3 w-3 mr-1" />
                Cliente
              </Badge>
              <span className="text-muted-foreground text-xs">Cliente específico</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                <Globe className="h-3 w-3 mr-1" />
                Todos
              </Badge>
              <span className="text-muted-foreground text-xs">Todos os clientes</span>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <Card>
            <CardContent className="p-0">
              <div className="space-y-2 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : filteredArticles && filteredArticles.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Número</TableHead>
                    <TableHead className="w-[140px]">Visibilidade</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="w-[80px]">Segmento</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[150px]">Autor</TableHead>
                    <TableHead className="w-[80px]">Views</TableHead>
                    <TableHead className="w-[120px]">Atualizado</TableHead>
                    <TableHead className="w-[60px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.map((article) => (
                    <FAQArticleRow
                      key={article.id}
                      article={article}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      canManage={canManageArticles}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum artigo encontrado
              </h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchTerm || segmentFilter !== "all" || visibilityFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Crie o primeiro artigo para começar"}
              </p>
              {canManageArticles && !searchTerm && segmentFilter === "all" && (
                <Button className="mt-4" onClick={handleNewArticle}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Artigo
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <FAQArticleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        article={editingArticle}
      />

      {/* View Dialog */}
      <FAQArticleViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        article={viewingArticle}
        onEdit={handleEditFromView}
        canEdit={canManageArticles}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Artigo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o artigo "{articleToDelete?.title}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => articleToDelete && deleteMutation.mutate(articleToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
