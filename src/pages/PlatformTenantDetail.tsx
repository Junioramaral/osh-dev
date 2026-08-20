import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TenantContactsSection } from "@/components/tenants/TenantContactsSection";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_platform_owner: boolean;
  created_at: string;
}

export default function PlatformTenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["platform-tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, is_active, is_platform_owner, created_at")
        .eq("id", tenantId)
        .single();
      if (error) throw error;
      return data as Tenant;
    },
    enabled: !!tenantId,
  });

  const toggleActive = useMutation({
    mutationFn: async () => {
      if (!tenant) return;
      const { error } = await supabase
        .from("tenants")
        .update({ is_active: !tenant.is_active })
        .eq("id", tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tenant?.is_active ? "Tenant suspenso" : "Tenant reativado");
      queryClient.invalidateQueries({ queryKey: ["platform-tenant", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar status do tenant", { description: error.message });
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/platform/tenants")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !tenant ? (
          <p className="text-muted-foreground">Tenant não encontrado.</p>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{tenant.name}</CardTitle>
                  <CardDescription>{tenant.slug}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {tenant.is_platform_owner && <Badge variant="secondary">Dono da plataforma</Badge>}
                  <Badge variant={tenant.is_active ? "default" : "destructive"}>
                    {tenant.is_active ? "Ativo" : "Suspenso"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Criado em</dt>
                  <dd>{new Date(tenant.created_at).toLocaleDateString("pt-BR")}</dd>
                </div>
              </dl>

              <div className="border-t pt-4">
                <TenantContactsSection tenantId={tenant.id} />
              </div>

              {!tenant.is_platform_owner && (
                <div className="border-t pt-4">
                  <Button
                    variant={tenant.is_active ? "destructive" : "default"}
                    onClick={() => toggleActive.mutate()}
                    disabled={toggleActive.isPending}
                  >
                    {toggleActive.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {tenant.is_active ? "Suspender tenant" : "Reativar tenant"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
