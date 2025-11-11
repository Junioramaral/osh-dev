import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, AlertCircle } from "lucide-react";

export default function Clients() {
  const { profile, isSuperAdmin, hasRole } = useAuth();
  
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_db') || hasRole('analyst_app'),
  });

  // Only admins and analysts can access this page
  if (!isSuperAdmin && !hasRole('tenant_admin') && !hasRole('analyst_db') && !hasRole('analyst_app')) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gerencie os clientes cadastrados</p>
          </div>
          {isSuperAdmin && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          )}
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
        ) : clients && clients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <Card key={client.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {client.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.cnpj && (
                    <p className="text-sm text-muted-foreground">
                      CNPJ: {client.cnpj}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant={client.status === "ativo" ? "default" : "secondary"}>
                      {client.status}
                    </Badge>
                  </div>
                  {client.tags && client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {client.tags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente cadastrado</h3>
              <p className="text-muted-foreground">Adicione o primeiro cliente para começar</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
