import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Search, ArrowLeft } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ApplicationInstanceDialog from "@/components/applications/ApplicationInstanceDialog";
import ClientEnvironmentCards, { type ClientCardData } from "@/components/common/ClientEnvironmentCards";

type SortField = "version" | "product_name" | "criticality" | "active_modules_count";
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

export default function Applications() {
  const { profile, isSuperAdmin, isViewer, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [environmentPages, setEnvironmentPages] = useState<Record<string, number>>({});
  const [environmentSorts, setEnvironmentSorts] = useState<Record<string, SortConfig>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["application-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_products")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ["application-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_instances")
        .select(`
          *,
          clients(id, name),
          application_products(id, name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredInstances = instances?.filter((instance) => {
    const productName = instance.application_products?.name || "";
    const clientName = instance.clients?.name || "";
    const version = instance.version || "";
    
    const searchLower = searchTerm.toLowerCase();
    
    return (
      productName.toLowerCase().includes(searchLower) ||
      clientName.toLowerCase().includes(searchLower) ||
      version.toLowerCase().includes(searchLower)
    );
  });

  const getEnvironmentKey = (clientName: string, environment: string) => {
    return `${clientName}::${environment}`;
  };

  const groupInstancesByClientAndEnvironment = () => {
    if (!filteredInstances) return {};
    
    const grouped: Record<string, Record<string, any[]>> = {};
    
    filteredInstances.forEach((instance) => {
      const clientName = instance.clients?.name || "Sem Cliente";
      const environment = instance.environment;
      
      if (!grouped[clientName]) {
        grouped[clientName] = {};
      }
      
      if (!grouped[clientName][environment]) {
        grouped[clientName][environment] = [];
      }
      
      grouped[clientName][environment].push(instance);
    });
    
    return grouped;
  };

  const groupedInstances = groupInstancesByClientAndEnvironment();
  const visibleGrouped = selectedClient
    ? (groupedInstances[selectedClient.name] ? { [selectedClient.name]: groupedInstances[selectedClient.name] } : {})
    : {};

  const clientCards: ClientCardData[] = (() => {
    if (!instances) return [];
    const map = new Map<string, ClientCardData>();
    instances.forEach((i: any) => {
      const id = i.client_id || "no-client";
      const name = i.clients?.name || "Sem Cliente";
      const env = i.environment || "dev";
      if (!map.has(id)) map.set(id, { clientId: id, clientName: name, total: 0, byEnvironment: {} });
      const entry = map.get(id)!;
      entry.total += 1;
      entry.byEnvironment[env] = (entry.byEnvironment[env] || 0) + 1;
    });
    return Array.from(map.values())
      .filter((c) => !searchTerm || c.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
  })();

  const getSortValue = (instance: any, field: SortField) => {
    switch (field) {
      case "version":
        return instance.version.toLowerCase();
      case "product_name":
        return (instance.application_products?.name || "").toLowerCase();
      case "criticality":
        const critOrder: Record<string, number> = { baixa: 1, media: 2, alta: 3, critica: 4 };
        return critOrder[instance.criticality || "media"] || 0;
      case "active_modules_count":
        return Array.isArray(instance.active_modules) ? instance.active_modules.length : 0;
      default:
        return "";
    }
  };

  const getSortedInstances = (envKey: string, instances: any[]) => {
    if (!instances) return [];
    
    const sortConfig = environmentSorts[envKey];
    
    if (!sortConfig || !sortConfig.field || !sortConfig.direction) {
      return instances;
    }

    return [...instances].sort((a, b) => {
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

  const getPaginatedInstances = (
    clientName: string,
    environment: string,
    instances: any[]
  ) => {
    const envKey = getEnvironmentKey(clientName, environment);
    const sortedInstances = getSortedInstances(envKey, instances);
    const currentPage = environmentPages[envKey] || 1;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedInstances.slice(startIndex, endIndex);
  };

  const handlePageChange = (clientName: string, environment: string, page: number) => {
    const envKey = getEnvironmentKey(clientName, environment);
    setEnvironmentPages(prev => ({ ...prev, [envKey]: page }));
  };

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

  const handleEditInstance = (instance: any) => {
    setSelectedInstance(instance);
    setDialogOpen(true);
  };

  const handleDeleteInstance = async (instance: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Tem certeza que deseja excluir esta implantação?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("application_instances")
        .delete()
        .eq("id", instance.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["application-instances"] });
    } catch (error) {
      console.error("Erro ao excluir implantação:", error);
      alert("Erro ao excluir implantação");
    }
  };

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

  const getTotalPages = (total: number) => Math.ceil(total / ITEMS_PER_PAGE);

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
                {selectedClient ? `Aplicativos · ${selectedClient.name}` : "Aplicativos"}
              </h1>
            </div>
            <p className="text-muted-foreground">Catálogo de produtos e implantações</p>
          </div>
          {selectedClient && !isViewer && (isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_app')) && (
            <Button onClick={() => {
              setSelectedInstance(null);
              setDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Implantação
            </Button>
          )}
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="instances">Implantações</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {productsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-[200px]" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        {product.name}
                      </CardTitle>
                      {product.description && (
                        <CardDescription>{product.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {product.modules && Array.isArray(product.modules) && product.modules.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Módulos:</p>
                          <div className="flex flex-wrap gap-1">
                            {product.modules.map((module: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {typeof module === 'string' ? module : module.name || 'Módulo'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum produto cadastrado</h3>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="instances" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={selectedClient ? "Buscar por produto, versão..." : "Buscar por cliente..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {instancesLoading ? (
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
                icon={Package}
                onSelect={setSelectedClient}
                emptyLabel="Nenhuma implantação cadastrada"
              />
            ) : Object.keys(visibleGrouped).length > 0 ? (
              <Accordion type="multiple" className="space-y-4">
                {Object.entries(visibleGrouped).map(([clientName, environmentGroups]) => {
                  const totalClientInstances = Object.values(environmentGroups).reduce(
                    (sum, envInstances) => sum + envInstances.length, 
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
                          <Package className="h-5 w-5 text-primary" />
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
                            .map(([environment, envInstances]) => {
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
                                        {envInstances.length}
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
                                              onClick={() => handleSort(clientName, environment, "product_name")}
                                            >
                                              Produto
                                              <SortIcon 
                                                clientName={clientName}
                                                environment={environment}
                                                field="product_name" 
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
                                          <TableHead>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 px-2 hover:bg-accent font-semibold"
                                              onClick={() => handleSort(clientName, environment, "active_modules_count")}
                                            >
                                              Módulos Ativos
                                              <SortIcon 
                                                clientName={clientName}
                                                environment={environment}
                                                field="active_modules_count" 
                                              />
                                            </Button>
                                          </TableHead>
                                          <TableHead className="w-[80px]">Ações</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      
                                      <TableBody>
                                        {getPaginatedInstances(clientName, environment, envInstances).map((instance) => (
                                          <TableRow 
                                            key={instance.id}
                                            className="cursor-pointer hover:bg-accent"
                                            onClick={() => handleEditInstance(instance)}
                                          >
                                            <TableCell className="font-medium">
                                              {instance.application_products?.name || "Produto Desconhecido"}
                                            </TableCell>
                                            <TableCell>
                                              <Badge variant="outline">v{instance.version}</Badge>
                                            </TableCell>
                                            <TableCell>
                                              {instance.criticality && (
                                                <Badge className={getCriticalityColor(instance.criticality)}>
                                                  {instance.criticality.charAt(0).toUpperCase() + instance.criticality.slice(1)}
                                                </Badge>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {instance.active_modules && Array.isArray(instance.active_modules) && (
                                                <div className="flex flex-wrap gap-1">
                                                  {instance.active_modules.slice(0, 3).map((module: any, idx: number) => (
                                                    <Badge key={idx} variant="secondary" className="text-xs">
                                                      {typeof module === 'string' ? module : module.name || 'Módulo'}
                                                    </Badge>
                                                  ))}
                                                  {instance.active_modules.length > 3 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                      +{instance.active_modules.length - 3}
                                                    </Badge>
                                                  )}
                                                </div>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {(isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_app')) && (
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={(e) => handleDeleteInstance(instance, e)}
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

                                    {envInstances.length > ITEMS_PER_PAGE && (
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
                                              { length: getTotalPages(envInstances.length) }, 
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
                                                  const totalPages = getTotalPages(envInstances.length);
                                                  if (currentPage < totalPages) {
                                                    handlePageChange(clientName, environment, currentPage + 1);
                                                  }
                                                }}
                                                className={cn(
                                                  "cursor-pointer",
                                                  (environmentPages[envKey] || 1) === 
                                                  getTotalPages(envInstances.length) && 
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
                  <h3 className="text-lg font-semibold mb-2">Nenhuma implantação encontrada</h3>
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "Tente ajustar o termo de busca"
                      : "Cadastre a primeira implantação"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ApplicationInstanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        instance={selectedInstance}
        lockedClientId={!selectedInstance ? selectedClient?.id : undefined}
      />
    </AppLayout>
  );
}
