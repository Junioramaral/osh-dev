import { Navigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TenantContactsSection } from "@/components/tenants/TenantContactsSection";

export default function MyTenant() {
  const { isTenantAdmin, tenant, isLoading } = useTenant();

  if (!isLoading && !isTenantAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meu Tenant</h1>
          <p className="text-muted-foreground">Informações da sua consultoria no OSH</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : tenant ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{tenant.name}</CardTitle>
                    <CardDescription>{tenant.slug}</CardDescription>
                  </div>
                </div>
                <Badge variant={tenant.is_active ? "default" : "destructive"}>
                  {tenant.is_active ? "Ativo" : "Suspenso"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="text-sm">
                <div>
                  <dt className="text-muted-foreground">Cliente desde</dt>
                  <dd className="mt-1">{format(new Date(tenant.created_at), "dd/MM/yyyy", { locale: ptBR })}</dd>
                </div>
              </dl>

              <div className="border-t pt-4">
                <TenantContactsSection tenantId={tenant.id} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-muted-foreground">Tenant não encontrado</p>
        )}
      </div>
    </AppLayout>
  );
}
