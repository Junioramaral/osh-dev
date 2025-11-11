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
import { Plus, Server, AlertCircle } from "lucide-react";

export default function Machines() {
  const { profile, isSuperAdmin, hasRole } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>("all");

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
    return matchesType;
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
            <h1 className="text-3xl font-bold text-foreground">Máquinas</h1>
            <p className="text-muted-foreground">Catálogo de ativos de infraestrutura</p>
          </div>
          {isSuperAdmin && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Máquina
            </Button>
          )}
        </div>

        <div className="flex gap-4">
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
        ) : filteredMachines && filteredMachines.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMachines.map((machine) => (
              <Card key={machine.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    {machine.hostname}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{machine.machine_type}</Badge>
                    <Badge variant={machine.status === "ativo" ? "default" : "secondary"}>
                      {machine.status}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    {machine.operating_system && (
                      <p className="text-muted-foreground">
                        SO: <span className="text-foreground">{machine.operating_system}</span>
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      Cliente: <span className="text-foreground">{machine.clients?.name}</span>
                    </p>
                    {machine.location && (
                      <p className="text-muted-foreground">
                        Local: <span className="text-foreground">{machine.location}</span>
                      </p>
                    )}
                  </div>
                  {machine.criticality && (
                    <Badge className={getCriticalityColor(machine.criticality)}>
                      Criticidade: {machine.criticality}
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
              <h3 className="text-lg font-semibold mb-2">Nenhuma máquina encontrada</h3>
              <p className="text-muted-foreground">
                {typeFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Cadastre a primeira máquina"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
