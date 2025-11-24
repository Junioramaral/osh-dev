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
import { Plus, Database, AlertCircle } from "lucide-react";
import DatabaseDialog from "@/components/databases/DatabaseDialog";
import type { Tables } from "@/integrations/supabase/types";

export default function Databases() {
  const { profile, isSuperAdmin, hasRole } = useAuth();
  const [engineFilter, setEngineFilter] = useState<string>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<Tables<"database_instances"> | null>(null);

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
    return matchesEngine && matchesEnvironment;
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

        <div className="flex gap-4">
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
                        <TableHead>Nome da Instância</TableHead>
                        <TableHead>Engine</TableHead>
                        <TableHead>Versão</TableHead>
                        <TableHead>Ambiente</TableHead>
                        <TableHead>Criticidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientDatabases.map((db) => (
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
    </AppLayout>
  );
}
