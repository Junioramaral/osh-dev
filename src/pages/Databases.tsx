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

const ENVIRONMENT_CONFIG = {
  prod: {
    label: "Produção",
    icon: "🏢",
    color: "text-red-600",
    bgColor: "bg-red-50",
    order: 1
  },
  hom: {
    label: "Homologação",
    icon: "🧪",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    order: 2
  },
  qa: {
    label: "QA",
    icon: "🔬",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    order: 3
  },
  dev: {
    label: "Desenvolvimento",
    icon: "💻",
    color: "text-green-600",
    bgColor: "bg-green-50",
    order: 4
  }
};

export default function Databases() {
  const { profile, isSuperAdmin, isViewer, hasRole } = useAuth();
  const [engineFilter, setEngineFilter] = useState<string>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<Tables<"database_instances"> | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [databaseToDelete, setDatabaseToDelete] = useState<Tables<"database_instances"> | null>(null);
  // Chave composta: "ClientName::Environment"
  const [environmentPages, setEnvironmentPages] = useState<Record<string, number>>({});
  const [environmentSorts, setEnvironmentSorts] = useState<Record<string, SortConfig>>({});
  
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

  // Função auxiliar para criar chave única por cliente+ambiente
  const getEnvironmentKey = (clientName: string, environment: string) => {
    return `${clientName}::${environment}`;
  };

  const groupDatabasesByClientAndEnvironment = () => {
    if (!filteredDatabases) return {};
    
    const grouped: Record<string, Record<string, Tables<"database_instances">[]>> = {};
    
    filteredDatabases.forEach((db) => {
      const clientName = db.clients?.name || "Sem Cliente";
      const environment = db.environment;
      
      if (!grouped[clientName]) {
        grouped[clientName] = {};
      }
      
      if (!grouped[clientName][environment]) {
        grouped[clientName][environment] = [];
      }
      
      grouped[clientName][environment].push(db);
    });
    
    return grouped;
  };

  const groupedDatabases = groupDatabasesByClientAndEnvironment();

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

  // Função para ordenar instâncias de um ambiente
  const getSortedDatabases = (envKey: string, databases: any[]) => {
    if (!databases) return [];
    
    const sortConfig = environmentSorts[envKey];
    
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

  const getPaginatedDatabases = (
    clientName: string,
    environment: string,
    databases: any[]
  ) => {
    const envKey = getEnvironmentKey(clientName, environment);
    const sortedDatabases = getSortedDatabases(envKey, databases);
    const currentPage = environmentPages[envKey] || 1;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedDatabases.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems: number) => {
    return Math.ceil(totalItems / ITEMS_PER_PAGE);
  };

  const handlePageChange = (clientName: string, environment: string, page: number) => {
    const envKey = getEnvironmentKey(clientName, environment);
    setEnvironmentPages(prev => ({
      ...prev,
      [envKey]: page
    }));
  };

  // Handler para mudança de ordenação
  const handleSort = (clientName: string, environment: string, field: SortField) => {
    const envKey = getEnvironmentKey(clientName, environment);
    setEnvironmentSorts(prev => {
      const currentSort = prev[envKey];
      
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
        [envKey]: {
          field: newDirection ? field : null,
          direction: newDirection,
        },
      };
    });
  };

  // Componente de ícone de ordenação
  const SortIcon = ({ 
    clientName, 
    environment,
    field 
  }: { 
    clientName: string;
    environment: string;
    field: SortField;
  }) => {
    const envKey = getEnvironmentKey(clientName, environment);
    const sortConfig = environmentSorts[envKey];
    
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
      critica: "bg-red-900 text-white hover:bg-red-900",
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
          {!isViewer && (isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_db')) && (
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
            {Object.entries(groupedDatabases).map(([clientName, environmentGroups]) => {
              const totalClientInstances = Object.values(environmentGroups).reduce(
                (sum, envDbs) => sum + envDbs.length, 
                0
              );
              
              return (
                <AccordionItem 
                  key={clientName} 
                  value={clientName}
                  className="border rounded-lg bg-card"
                >
                  <AccordionTrigger className="px-6 hover:no-underline hover:bg-accent/50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-primary" />
                      <span className="text-lg font-semibold">{clientName}</span>
                      <Badge variant="secondary">{totalClientInstances}</Badge>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-6 pb-4">
                    <Accordion type="multiple" className="space-y-2 mt-2">
                      {Object.entries(environmentGroups)
                        .sort(([envA], [envB]) => {
                          const configA = ENVIRONMENT_CONFIG[envA as keyof typeof ENVIRONMENT_CONFIG];
                          const configB = ENVIRONMENT_CONFIG[envB as keyof typeof ENVIRONMENT_CONFIG];
                          return (configA?.order || 99) - (configB?.order || 99);
                        })
                        .map(([environment, envDatabases]) => {
                          const envConfig = ENVIRONMENT_CONFIG[environment as keyof typeof ENVIRONMENT_CONFIG];
                          const envKey = getEnvironmentKey(clientName, environment);
                          
                          return (
                            <AccordionItem 
                              key={envKey} 
                              value={envKey}
                              className="border rounded-md"
                            >
                              <AccordionTrigger 
                                className={cn(
                                  "px-4 py-3 hover:no-underline hover:bg-accent/30 rounded-t-md",
                                  envConfig?.bgColor
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{envConfig?.icon || "📁"}</span>
                                  <span className={cn("font-medium", envConfig?.color)}>
                                    {envConfig?.label || environment.toUpperCase()}
                                  </span>
                                  <Badge variant="outline" className="ml-2">
                                    {envDatabases.length}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              
                              <AccordionContent className="px-4 pb-4 pt-2">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 hover:bg-accent font-semibold"
                                          onClick={() => handleSort(clientName, environment, "instance_name")}
                                        >
                                          Nome da Instância
                                          <SortIcon 
                                            clientName={clientName}
                                            environment={environment}
                                            field="instance_name" 
                                          />
                                        </Button>
                                      </TableHead>
                                      <TableHead>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 hover:bg-accent font-semibold"
                                          onClick={() => handleSort(clientName, environment, "engine")}
                                        >
                                          Engine
                                          <SortIcon 
                                            clientName={clientName}
                                            environment={environment}
                                            field="engine" 
                                          />
                                        </Button>
                                      </TableHead>
                                      <TableHead>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 hover:bg-accent font-semibold"
                                          onClick={() => handleSort(clientName, environment, "version")}
                                        >
                                          Versão
                                          <SortIcon 
                                            clientName={clientName}
                                            environment={environment}
                                            field="version" 
                                          />
                                        </Button>
                                      </TableHead>
                                      <TableHead>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 hover:bg-accent font-semibold"
                                          onClick={() => handleSort(clientName, environment, "criticality")}
                                        >
                                          Criticidade
                                          <SortIcon 
                                            clientName={clientName}
                                            environment={environment}
                                            field="criticality" 
                                          />
                                        </Button>
                                      </TableHead>
                                      <TableHead className="w-[80px]">Ações</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  
                                  <TableBody>
                                    {getPaginatedDatabases(clientName, environment, envDatabases).map((db) => (
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

                                {envDatabases.length > ITEMS_PER_PAGE && (
                                  <div className="mt-4">
                                    <Pagination>
                                      <PaginationContent>
                                        <PaginationItem>
                                          <PaginationPrevious
                                            onClick={() => {
                                              const currentPage = environmentPages[envKey] || 1;
                                              if (currentPage > 1) {
                                                handlePageChange(clientName, environment, currentPage - 1);
                                              }
                                            }}
                                            className={cn(
                                              "cursor-pointer",
                                              (environmentPages[envKey] || 1) === 1 && 
                                              "pointer-events-none opacity-50"
                                            )}
                                          />
                                        </PaginationItem>

                                        {Array.from(
                                          { length: getTotalPages(envDatabases.length) }, 
                                          (_, i) => i + 1
                                        ).map((page) => {
                                          const currentPage = environmentPages[envKey] || 1;
                                          return (
                                            <PaginationItem key={page}>
                                              <PaginationLink
                                                onClick={() => handlePageChange(clientName, environment, page)}
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
                                              const currentPage = environmentPages[envKey] || 1;
                                              const totalPages = getTotalPages(envDatabases.length);
                                              if (currentPage < totalPages) {
                                                handlePageChange(clientName, environment, currentPage + 1);
                                              }
                                            }}
                                            className={cn(
                                              "cursor-pointer",
                                              (environmentPages[envKey] || 1) === 
                                              getTotalPages(envDatabases.length) && 
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
                          );
                        })}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
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
