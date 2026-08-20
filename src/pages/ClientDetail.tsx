import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertCircle } from "lucide-react";
import ClientForm from "@/components/clients/ClientForm";
import { formatCnpj } from "@/lib/cnpjUtils";

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  ativo: "default",
  inativo: "secondary",
  suspenso: "destructive",
};

export default function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { isTenantStaff } = useTenant();

  const hasAccess = isTenantStaff;

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && hasAccess,
  });

  if (!hasAccess) {
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

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cliente não encontrado</p>
          <Button onClick={() => navigate("/clients")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Clientes
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/clients")}
            className="mt-1 shrink-0"
            aria-label="Voltar para clientes"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{client.name}</h1>
              {client.status && (
                <Badge variant={statusVariant[client.status] ?? "secondary"}>{client.status}</Badge>
              )}
            </div>
            <p className="text-muted-foreground">CNPJ: {client.cnpj ? formatCnpj(client.cnpj) : "N/A"}</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <ClientForm mode="edit" client={client} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}