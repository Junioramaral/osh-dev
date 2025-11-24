import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Database, AlertCircle, Search, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import DatabaseDialog from "@/components/databases/DatabaseDialog";
import { useDeleteDatabase } from "@/hooks/useDatabaseMutations";
import type { Tables } from "@/integrations/supabase/types";

type SortField = "instance_name" | "engine" | "version" | "environment" | "criticality";
type SortDirection = "asc" | "desc" | null;

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

const ITEMS_PER_PAGE = 10;

export default function Databases() {
  const { profile, isSuperAdmin, hasRole } = useAuth();
  const [engineFilter, setEngineFilter] = useState<string>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<Tables<"database_instances"> | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [databaseToDelete, setDatabaseToDelete] = useState<Tables<"database_instances"> | null>(null);
  const [clientPages, setClientPages] = useState<Record<string, number>>({});
  const [clientSorts, setClientSorts] = useState<Record<string, SortConfig>>({});
  
  const deleteDatabase = useDeleteDatabase();

  const { data: databases, isLoading } = useQuery({
    queryKey: ["databases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("database_instances")
        .select(`
          *,
          clients(name)
        `)
        .order("instance_name");
      
      if (error) throw error;
      return data;
    },
  });

  const filteredDatabases = databases?.filter((db) => {
    const matchesEngine = engineFilter === "all" || db.engine === engineFilter;
    const matchesEnvironment = environmentFilter === "all" || db.environment === environmentFilter;
    const matchesSearch = searchQuery === "" || 
      db.instance_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEngine && matchesEnvironment && matchesSearch;
  });

  const groupDatabasesByClient = () => {
    if (!filteredDatabases) return {};
    
    return filteredDatabases.reduce((acc, db) => {
      const clientName = db.clients?.name || "Sem Cliente";
      if (!acc[clientName]) {
        acc[clientName] = [];
      }
      acc[clientName].push(db);
      return acc;
    }, {} as Record<string, typeof filteredDatabases>);
  };

  const groupedDatabases = groupDatabasesByClient();

  const handleEditDatabase = (db: Tables<"database_instances">) => {
    setSelectedDatabase(db);
    setIsDialogOpen(true);
  };

  const handleNewDatabase = () => {
    setSelectedDatabase(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedDatabase(null);
    }
  };

  const handleDeleteClick = (db: Tables<"database_instances">, e: React.MouseEvent) => {
    e.stopPropagation();
    setDatabaseToDelete(db);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (databaseToDelete) {
      deleteDatabase.mutate(databaseToDelete.id);
      setDeleteDialogOpen(false);
      setDatabaseToDelete(null);
    }
  };

  // Função para obter valor de ordenação customizado
  const getSortValue = (db: Tables<"database_instances">, field: SortField) => {
    switch (field) {
      case "instance_name":
        return db.instance_name.toLowerCase();
      case "engine":
        return db.engine.toLowerCase();
      case "version":
        return db.version.toLowerCase();
      case "environment":
        // Ordem lógica: dev -> qa -> hom -> prod
        const envOrder: Record<string, number> = { dev: 1, qa: 2, hom: 3, prod: 4 };
        return envOrder[db.environment] || 0;
      case "criticality":
        // Ordem lógica: baixa -> media -> alta
        const critOrder: Record<string, number> = { baixa: 1, media: 2, alta: 3 };
        return critOrder[db.criticality || "media"] || 0;
      default:
        return "";
    }
  };

  // Função para ordenar instâncias de um cliente
  const getSortedDatabases = (clientName: string, databases: typeof filteredDatabases) => {
    if (!databases) return [];
    
    const sortConfig = clientSorts[clientName];
    
    if (!sortConfig || !sortConfig.field || !sortConfig.direction) {
      return databases; // Sem ordenação, retorna original
    }

    return [...databases].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.field!);
      const bValue = getSortValue(b, sortConfig.field!);
      
      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const getPaginatedDatabases = (clientName: string, databases: typeof filteredDatabases) => {
    const sortedDatabases = getSortedDatabases(clientName, databases);
    const currentPage = clientPages[clientName] || 1;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedDatabases.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems: number) => {
    return Math.ceil(totalItems / ITEMS_PER_PAGE);
  };

  const handlePageChange = (clientName: string, page: number) => {
    setClientPages(prev => ({
      ...prev,
      [clientName]: page
    }));
  };

  // Handler para mudança de ordenação
  const handleSort = (clientName: string, field: SortField) => {
    setClientSorts(prev => {
      const currentSort = prev[clientName];
      
      let newDirection: SortDirection = "asc";
      
      // Se já está ordenando por este campo, alternar direção
      if (currentSort?.field === field) {
        if (currentSort.direction === "asc") {
          newDirection = "desc";
        } else if (currentSort.direction === "desc") {
          newDirection = null; // Remove ordenação
        }
      }
      
      return {
        ...prev,
        [clientName]: {
          field: newDirection ? field : null,
          direction: newDirection,
        },
      };
    });
  };

  // Componente de ícone de ordenação
  const SortIcon = ({ clientName, field }: { clientName: string; field: SortField }) => {
    const sortConfig = clientSorts[clientName];
    
    if (!sortConfig || sortConfig.field !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    
    if (sortConfig.direction === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4 text-primary" />;
    }
    
    if (sortConfig.direction === "desc") {
      return <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
    }
    
    return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
  };

  const getCriticalityColor = (criticality: string) => {
    const colors = {
      baixa: "bg-success text-success-foreground",
      media: "bg-warning text-warning-foreground",
      alta: "bg-destructive text-destructive-foreground",
    };
    return colors[criticality as keyof typeof colors] || "bg-muted";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bancos de Dados</h1>
            <p className="text-muted-foreground">Catálogo de instâncias de banco de dados</p>
          </div>
          {(isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_db')) && (
            <Button onClick={handleNewDatabase}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Instância
            </Button>
          )}
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[300px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da instância..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={engineFilter} onValueChange={setEngineFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Engine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Engines</SelectItem>
              <SelectItem value="Oracle">Oracle</SelectItem>
              <SelectItem value="PostgreSQL">PostgreSQL</SelectItem>
              <SelectItem value="MySQL">MySQL</SelectItem>
              <SelectItem value="MongoDB">MongoDB</SelectItem>
              <SelectItem value="SQL Server">SQL Server</SelectItem>
            </SelectContent>
          </Select>
          <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ambiente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Ambientes</SelectItem>
              <SelectItem value="prod">Produção</SelectItem>
              <SelectItem value="hom">Homologação</SelectItem>
              <SelectItem value="qa">QA</SelectItem>
              <SelectItem value="dev">Desenvolvimento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDatabases && filteredDatabases.length > 0 ? (
          <Accordion type="multiple" className="space-y-4">
            {Object.entries(groupedDatabases).map(([clientName, clientDatabases]) => (
              <AccordionItem 
                key={clientName} 
                value={clientName}
                className="border rounded-lg bg-card"
              >
                <AccordionTrigger className="px-6 hover:no-underline hover:bg-accent/50 rounded-t-lg">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-primary" />
                    <span className="text-lg font-semibold">{clientName}</span>
                    <Badge variant="secondary">{clientDatabases.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 hover:bg-accent font-semibold"
                        onClick={() => handleSort(clientName, "instance_name")}
                      >
                        Nome da Instância
                        <SortIcon clientName={clientName} field="instance_name" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 hover:bg-accent font-semibold"
                        onClick={() => handleSort(clientName, "engine")}
                      >
                        Engine
                        <SortIcon clientName={clientName} field="engine" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 hover:bg-accent font-semibold"
                        onClick={() => handleSort(clientName, "version")}
                      >
                        Versão
                        <SortIcon clientName={clientName} field="version" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 hover:bg-accent font-semibold"
                        onClick={() => handleSort(clientName, "environment")}
                      >
                        Ambiente
                        <SortIcon clientName={clientName} field="environment" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 hover:bg-accent font-semibold"
                        onClick={() => handleSort(clientName, "criticality")}
                      >
                        Criticidade
                        <SortIcon clientName={clientName} field="criticality" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                    <TableBody>
                      {getPaginatedDatabases(clientName, clientDatabases).map((db) => (
                        <TableRow 
                          key={db.id}
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => handleEditDatabase(db)}
                        >
                          <TableCell className="font-medium">{db.instance_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{db.engine}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{db.version}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {db.environment === "prod" ? "Produção" :
                               db.environment === "hom" ? "Homologação" :
                               db.environment === "qa" ? "QA" : "Desenvolvimento"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {db.criticality && (
                              <Badge className={getCriticalityColor(db.criticality)}>
                                {db.criticality.charAt(0).toUpperCase() + db.criticality.slice(1)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {(isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_db')) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDeleteClick(db, e)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {clientDatabases.length > ITEMS_PER_PAGE && (
                    <div className="mt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => {
                                const currentPage = clientPages[clientName] || 1;
                                if (currentPage > 1) {
                                  handlePageChange(clientName, currentPage - 1);
                                }
                              }}
                              className={cn(
                                "cursor-pointer",
                                (clientPages[clientName] || 1) === 1 && "pointer-events-none opacity-50"
                              )}
                            />
                          </PaginationItem>

                          {Array.from({ length: getTotalPages(clientDatabases.length) }, (_, i) => i + 1).map((page) => {
                            const currentPage = clientPages[clientName] || 1;
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => handlePageChange(clientName, page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() => {
                                const currentPage = clientPages[clientName] || 1;
                                const totalPages = getTotalPages(clientDatabases.length);
                                if (currentPage < totalPages) {
                                  handlePageChange(clientName, currentPage + 1);
                                }
                              }}
                              className={cn(
                                "cursor-pointer",
                                (clientPages[clientName] || 1) === getTotalPages(clientDatabases.length) && 
                                "pointer-events-none opacity-50"
                              )}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma instância encontrada</h3>
              <p className="text-muted-foreground">
                {engineFilter !== "all" || environmentFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Cadastre a primeira instância de banco de dados"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      <DatabaseDialog 
        open={isDialogOpen} 
        onOpenChange={handleDialogClose}
        database={selectedDatabase}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a instância{" "}
              <strong>{databaseToDelete?.instance_name}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
