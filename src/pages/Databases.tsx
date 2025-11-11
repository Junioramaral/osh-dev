import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Database, AlertCircle } from "lucide-react";

export default function Databases() {
  const { profile, isSuperAdmin, hasRole } = useAuth();
  const [engineFilter, setEngineFilter] = useState<string>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");

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
            <Button>
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
              <SelectItem value="oracle">Oracle</SelectItem>
              <SelectItem value="postgresql">PostgreSQL</SelectItem>
              <SelectItem value="mysql">MySQL</SelectItem>
              <SelectItem value="mongodb">MongoDB</SelectItem>
              <SelectItem value="sqlserver">SQL Server</SelectItem>
            </SelectContent>
          </Select>
          <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ambiente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Ambientes</SelectItem>
              <SelectItem value="producao">Produção</SelectItem>
              <SelectItem value="homologacao">Homologação</SelectItem>
              <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
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
        ) : filteredDatabases && filteredDatabases.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDatabases.map((db) => (
              <Card key={db.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    {db.instance_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{db.engine.toUpperCase()}</Badge>
                    <Badge variant="secondary">{db.environment}</Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      Versão: <span className="text-foreground">{db.version}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Cliente: <span className="text-foreground">{db.clients?.name}</span>
                    </p>
                  </div>
                  {db.criticality && (
                    <Badge className={getCriticalityColor(db.criticality)}>
                      Criticidade: {db.criticality}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
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
    </AppLayout>
  );
}
