import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Server, AlertCircle, Search, ArrowUpDown, ArrowUp, ArrowDown, Trash2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";
import MachineDialog from "@/components/machines/MachineDialog";
import { useQueryClient } from "@tanstack/react-query";
import ClientEnvironmentCards, { type ClientCardData } from "@/components/common/ClientEnvironmentCards";

type SortField = "hostname" | "machine_type" | "operating_system" | "criticality";
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

export default function Machines() {
  const { profile } = useAuth();
  const { isTenantAdmin } = useTenant();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [environmentPages, setEnvironmentPages] = useState<Record<string, number>>({});
  const [environmentSorts, setEnvironmentSorts] = useState<Record<string, SortConfig>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMachine, setSelectedMachine] = useState<Tables<"machines"> | null>(null);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);

  const { data: machines, isLoading } = useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select(`
          *,
          clients(name)
        `)
        .order("hostname");
      
      if (error) throw error;
      return data;
    },
  });

  const filteredMachines = machines?.filter((machine) => {
    const matchesType = typeFilter === "all" || machine.machine_type === typeFilter;
    const matchesSearch = 
      machine.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.operating_system?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  // Build per-client cards from ALL machines (not filtered by search/type)
  const clientCards: ClientCardData[] = (() => {
    if (!machines) return [];
    const map = new Map<string, ClientCardData>();
    machines.forEach((m: any) => {
      const id = m.client_id || "no-client";
      const name = m.clients?.name || "Sem Cliente";
      const env = m.environment || "dev";
      if (!map.has(id)) map.set(id, { clientId: id, clientName: name, total: 0, byEnvironment: {} });
      const entry = map.get(id)!;
      entry.total += 1;
      entry.byEnvironment[env] = (entry.byEnvironment[env] || 0) + 1;
    });
    return Array.from(map.values())
      .filter((c) => !searchTerm || c.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
  })();

  // Chave composta para paginação e ordenação por ambiente
  const getEnvironmentKey = (clientName: string, environment: string) => {
    return `${clientName}::${environment}`;
  };

  // Agrupar máquinas por cliente e ambiente
  const groupMachinesByClientAndEnvironment = () => {
    if (!filteredMachines) return {};
    
    const grouped: Record<string, Record<string, any[]>> = {};
    
    filteredMachines.forEach((machine) => {
      const clientName = machine.clients?.name || "Sem Cliente";
      const environment = machine.environment || "dev";
      
      if (!grouped[clientName]) {
        grouped[clientName] = {};
      }
      
      if (!grouped[clientName][environment]) {
        grouped[clientName][environment] = [];
      }
      
      grouped[clientName][environment].push(machine);
    });
    
    return grouped;
  };

  const groupedMachines = groupMachinesByClientAndEnvironment();

  // When a client is selected, scope grouped data to just that client
  const visibleGrouped = selectedClient
    ? (groupedMachines[selectedClient.name] ? { [selectedClient.name]: groupedMachines[selectedClient.name] } : {})
    : {};

  // Função para obter valor de ordenação
  const getSortValue = (machine: any, field: SortField) => {
    switch (field) {
      case "hostname":
        return machine.hostname.toLowerCase();
      case "machine_type":
        return machine.machine_type.toLowerCase();
      case "operating_system":
        return (machine.operating_system || "").toLowerCase();
      case "criticality":
        const critOrder: Record<string, number> = { baixa: 1, media: 2, alta: 3 };
        return critOrder[machine.criticality || "media"] || 0;
      default:
        return "";
    }
  };

  // Ordenar máquinas
  const getSortedMachines = (envKey: string, machines: any[]) => {
    if (!machines) return [];
    
    const sortConfig = environmentSorts[envKey];
    
    if (!sortConfig || !sortConfig.field || !sortConfig.direction) {
      return machines;
    }

    return [...machines].sort((a, b) => {
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

  // Paginar máquinas
  const getPaginatedMachines = (
    clientName: string,
    environment: string,
    machines: any[]
  ) => {
    const envKey = getEnvironmentKey(clientName, environment);
    const sortedMachines = getSortedMachines(envKey, machines);
    const currentPage = environmentPages[envKey] || 1;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedMachines.slice(startIndex, endIndex);
  };

  // Handler de mudança de página
  const handlePageChange = (clientName: string, environment: string, page: number) => {
    const envKey = getEnvironmentKey(clientName, environment);
    setEnvironmentPages(prev => ({ ...prev, [envKey]: page }));
  };

  // Handler de ordenação
  const handleSort = (clientName: string, environment: string, field: SortField) => {
    const envKey = getEnvironmentKey(clientName, environment);
    setEnvironmentSorts(prev => {
      const currentSort = prev[envKey];
      
      let newDirection: SortDirection = "asc";
      
      if (currentSort?.field === field) {
        if (currentSort.direction === "asc") {
          newDirection = "desc";
        } else if (currentSort.direction === "desc") {
          newDirection = null;
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

  // Total de páginas
  const getTotalPages = (total: number) => Math.ceil(total / ITEMS_PER_PAGE);

  // Handler de edição
  const handleEditMachine = (machine: Tables<"machines">) => {
    setSelectedMachine(machine);
    setIsDialogOpen(true);
  };

  // Handler de exclusão
  const handleDeleteMachine = async (machine: Tables<"machines">, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Tem certeza que deseja excluir a máquina "${machine.hostname}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("machines")
        .delete()
        .eq("id", machine.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["machines"] });
    } catch (error) {
      console.error("Erro ao excluir máquina:", error);
      alert("Erro ao excluir máquina");
    }
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
            <div className="flex items-center gap-3">
              {selectedClient && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
              )}
              <h1 className="text-3xl font-bold text-foreground">
                {selectedClient ? `Máquinas · ${selectedClient.name}` : "Máquinas"}
              </h1>
            </div>
            <p className="text-muted-foreground">Catálogo de ativos de infraestrutura</p>
          </div>
          {selectedClient && isTenantAdmin && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Máquina
            </Button>
          )}
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={selectedClient ? "Buscar por hostname, SO..." : "Buscar por cliente..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {selectedClient && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Tipos</SelectItem>
              <SelectItem value="servidor">Servidor</SelectItem>
              <SelectItem value="vm">Máquina Virtual</SelectItem>
              <SelectItem value="desktop">Desktop</SelectItem>
              <SelectItem value="cloud">Cloud</SelectItem>
            </SelectContent>
          </Select>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-[250px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !selectedClient ? (
          <ClientEnvironmentCards
            items={clientCards}
            icon={Server}
            onSelect={setSelectedClient}
            emptyLabel="Nenhuma máquina cadastrada"
          />
        ) : Object.keys(visibleGrouped).length > 0 ? (
          <Accordion type="multiple" className="space-y-4">
            {Object.entries(visibleGrouped).map(([clientName, environmentGroups]) => {
              const totalClientMachines = Object.values(environmentGroups).reduce(
                (sum, envMachines) => sum + envMachines.length, 
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
                      <Server className="h-5 w-5 text-primary" />
                      <span className="text-lg font-semibold">{clientName}</span>
                      <Badge variant="secondary">{totalClientMachines}</Badge>
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
                        .map(([environment, envMachines]) => {
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
                                    {envMachines.length}
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
                                          onClick={() => handleSort(clientName, environment, "hostname")}
                                        >
                                          Hostname
                                          <SortIcon 
                                            clientName={clientName}
                                            environment={environment}
                                            field="hostname" 
                                          />
                                        </Button>
                                      </TableHead>
                                      <TableHead>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 hover:bg-accent font-semibold"
                                          onClick={() => handleSort(clientName, environment, "machine_type")}
                                        >
                                          Tipo
                                          <SortIcon 
                                            clientName={clientName}
                                            environment={environment}
                                            field="machine_type" 
                                          />
                                        </Button>
                                      </TableHead>
                                      <TableHead>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 hover:bg-accent font-semibold"
                                          onClick={() => handleSort(clientName, environment, "operating_system")}
                                        >
                                          Sistema Operacional
                                          <SortIcon 
                                            clientName={clientName}
                                            environment={environment}
                                            field="operating_system" 
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
                                      <TableHead>Local</TableHead>
                                      <TableHead className="w-[80px]">Ações</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  
                                  <TableBody>
                                    {getPaginatedMachines(clientName, environment, envMachines).map((machine) => (
                                      <TableRow 
                                        key={machine.id}
                                        className="cursor-pointer hover:bg-accent"
                                        onClick={() => handleEditMachine(machine)}
                                      >
                                        <TableCell className="font-medium">{machine.hostname}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline">{machine.machine_type}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                          {machine.operating_system || "-"}
                                        </TableCell>
                                        <TableCell>
                                          {machine.criticality && (
                                            <Badge className={getCriticalityColor(machine.criticality)}>
                                              {machine.criticality.charAt(0).toUpperCase() + machine.criticality.slice(1)}
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                          {machine.location || "-"}
                                        </TableCell>
                                        <TableCell>
                                          {isTenantAdmin && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => handleDeleteMachine(machine, e)}
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

                                {envMachines.length > ITEMS_PER_PAGE && (
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
                                          { length: getTotalPages(envMachines.length) }, 
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
                                              const totalPages = getTotalPages(envMachines.length);
                                              if (currentPage < totalPages) {
                                                handlePageChange(clientName, environment, currentPage + 1);
                                              }
                                            }}
                                            className={cn(
                                              "cursor-pointer",
                                              (environmentPages[envKey] || 1) === 
                                              getTotalPages(envMachines.length) && 
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
              <h3 className="text-lg font-semibold mb-2">Nenhuma máquina encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm || typeFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Cadastre a primeira máquina"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <MachineDialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedMachine(null);
        }}
        machine={selectedMachine}
        lockedClientId={!selectedMachine ? selectedClient?.id : undefined}
      />
    </AppLayout>
  );
}
