import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Building2, AlertCircle, Mail, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import ClientDialog from "@/components/clients/ClientDialog";
import { formatCnpj } from "@/lib/cnpjUtils";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;

// Legacy self-referential "Otimizzo" row in `clients` (inserted in
// 20251111123409_a778cfc7-8d63-47a9-91df-f6ae977f00a8.sql, predates the
// tenants/clients split) — confirmed via direct query still active, with
// tenant_id correctly pointing at the real Otimizzo tenant. It's a pseudo-client
// used historically to bucket internal staff profiles (domain otimizzo.com),
// not one of the real clients (ATPPOA, Adentro Tecnologia LTDA, sec4file,
// lexisflow). This is a one-off artifact unique to Otimizzo's dual identity
// (CLAUDE.md Regra crítica #2) — no future tenant gets an equivalent row, so
// hardcoding this specific id (rather than a general rule) is intentional.
const OTIMIZZO_CLIENT_ID = "00000000-0000-0000-0000-000000000001";

export default function Clients() {
  const { profile } = useAuth();
  const { isTenantStaff, isTenantAdmin } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .is("deleted_at", null)
        .neq("id", OTIMIZZO_CLIENT_ID)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: isTenantStaff,
  });

  const toggleClientStatus = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("clients")
      .update({ is_active: !client.is_active })
      .eq("id", client.id);

    if (error) {
      toast.error("Erro ao alterar status do cliente", { description: error.message });
      return;
    }
    toast.success(`Cliente ${!client.is_active ? "ativado" : "desativado"} com sucesso`);
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const softDeleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("client_id", clientId);

      if (profilesError) throw profilesError;

      let deletedUsersCount = 0;
      for (const p of profiles || []) {
        try {
          const { error: authDeleteError } = await supabase.functions.invoke("manage-user", {
            body: { action: "delete", userId: p.id },
          });
          if (authDeleteError) console.error(`Erro ao deletar usuário ${p.full_name}:`, authDeleteError);
          else deletedUsersCount++;
        } catch (err) {
          console.error(`Erro ao deletar usuário ${p.full_name}:`, err);
        }
      }

      const { error: rolesError } = await supabase.from("user_roles").delete().eq("tenant_id", clientId);
      if (rolesError) console.error("Erro ao deletar user_roles:", rolesError);

      const { error: deleteError } = await supabase
        .from("clients")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", clientId);
      if (deleteError) throw deleteError;

      return { deletedUsers: deletedUsersCount };
    },
    onSuccess: (data) => {
      toast.success("Cliente desativado permanentemente", {
        description: `Cliente desativado (dados preservados) e ${data.deletedUsers} usuário(s) tiveram a conta deletada permanentemente.`,
      });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao desativar cliente", { description: error.message });
    },
  });

  const handleDeleteClick = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setClientToDelete(client);
    setConfirmText("");
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete || confirmText !== clientToDelete.name) {
      toast.error("O nome digitado não corresponde ao cliente");
      return;
    }
    await softDeleteClientMutation.mutateAsync(clientToDelete.id);
    setIsDeleteDialogOpen(false);
    setClientToDelete(null);
    setConfirmText("");
  };

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

  // Only admins and analysts can access this page
  if (!isTenantStaff) {
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
          {isTenantAdmin && (
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
                className="hover:shadow-lg transition-shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                role="button"
                tabIndex={0}
                aria-label={`Ver detalhes de ${client.name}`}
                onClick={() => navigate(`/clients/${client.id}`)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/clients/${client.id}`);
                  }
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
                      CNPJ: {formatCnpj(client.cnpj)}
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

                  {isTenantAdmin && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant={client.is_active ? "outline" : "default"}
                        size="sm"
                        className="flex-1"
                        onClick={(e) => toggleClientStatus(client, e)}
                      >
                        {client.is_active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => handleDeleteClick(client, e)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Desativação Permanente de Cliente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold text-foreground">
                Você está prestes a desativar permanentemente o cliente "{clientToDelete?.name}".
              </p>

              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 space-y-2">
                <p className="font-medium text-destructive text-sm">⚠️ Esta ação é IRREVERSÍVEL e irá:</p>
                <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                  <li>• Desativar permanentemente o cliente (some das listagens, mas os dados permanecem no banco)</li>
                  <li>• Deletar todas as contas de usuário do Auth vinculadas</li>
                  <li>• Deletar todas as associações de usuários (roles)</li>
                </ul>
              </div>

              <p className="text-sm">
                Para confirmar, digite o nome do cliente:{" "}
                <span className="font-mono font-bold text-foreground">{clientToDelete?.name}</span>
              </p>

              <Input
                placeholder={`Digite "${clientToDelete?.name}" para confirmar`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="font-mono"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={softDeleteClientMutation.isPending}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={confirmText !== clientToDelete?.name || softDeleteClientMutation.isPending}
            >
              {softDeleteClientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desativar Permanentemente
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
