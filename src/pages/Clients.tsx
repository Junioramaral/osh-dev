import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Building2, AlertCircle, Mail } from "lucide-react";
import ClientDialog from "@/components/clients/ClientDialog";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;

export default function Clients() {
  const { profile, isSuperAdmin, isViewer, hasRole } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
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
    enabled: isSuperAdmin || isViewer || hasRole('tenant_admin') || hasRole('analyst_db') || hasRole('analyst_app'),
  });

  const { data: appProducts } = useQuery({
    queryKey: ["application_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_products")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Only admins, analysts and viewers can access this page
  if (!isSuperAdmin && !isViewer && !hasRole('tenant_admin') && !hasRole('analyst_db') && !hasRole('analyst_app')) {
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
          {isSuperAdmin && !isViewer && (
            <Button
              onClick={() => {
                setDialogMode("create");
                setSelectedClient(null);
                setDialogOpen(true);
              }}
            >
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
              <Card
                key={client.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setDialogMode("edit");
                  setSelectedClient(client);
                  setDialogOpen(true);
                }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="flex-1">{client.name}</span>
                    {(client as any).receive_monthly_report && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Mail className="h-4 w-4 text-primary" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Recebe relatório mensal</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
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

                  {client.segments?.includes("DB") && client.db_engines && client.db_engines.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">Bancos:</span>
                      <div className="flex flex-wrap gap-1">
                        {client.db_engines.map((engine) => (
                          <Badge key={engine} variant="outline" className="text-xs">
                            {engine}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {client.segments?.includes("APP") && client.app_product_ids && client.app_product_ids.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">Aplicações:</span>
                      <div className="flex flex-wrap gap-1">
                        {client.app_product_ids.map((productId) => {
                          const product = appProducts?.find(p => p.id === productId);
                          return product ? (
                            <Badge key={productId} variant="outline" className="text-xs">
                              {product.name}
                            </Badge>
                          ) : null;
                        })}
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
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente cadastrado</h3>
              <p className="text-muted-foreground">Adicione o primeiro cliente para começar</p>
            </CardContent>
          </Card>
        )}

        <ClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          client={selectedClient}
        />
      </div>
    </AppLayout>
  );
}
