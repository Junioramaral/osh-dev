import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Users, CheckCircle, XCircle, AlertTriangle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cleanPhone, isValidPhone } from "@/lib/phoneUtils";
import { formatCnpj } from "@/lib/cnpjUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  cnpj: string | null;
  tenant_type: string;
  segments: string[];
  is_active: boolean;
  status: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
  max_users: number;
}

export default function TenantAdmin() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: "",
    cnpj: "",
    domain: "",
    admin_email: "",
    admin_name: "",
    admin_phone: "",
    max_users: 10,
  });
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const { data: tenants, isLoading, refetch } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Tenant[];
    },
    enabled: isSuperAdmin,
  });


  const handleCreateTenant = async () => {
    if (!newTenant.name || !newTenant.domain || !newTenant.admin_email || !newTenant.admin_name) {
      toast.error("Preencha todos os campos obrigatórios (Nome, Domínio, Email e Nome do Contato)");
      return;
    }

    // Validate admin email domain
    const emailDomain = newTenant.admin_email.split('@')[1]?.toLowerCase();
    if (emailDomain !== newTenant.domain.toLowerCase()) {
      toast.error(
        `O email do contato deve pertencer ao domínio ${newTenant.domain}`,
        { description: `Email fornecido: ${newTenant.admin_email}` }
      );
      return;
    }

    // Validate phone if provided
    if (newTenant.admin_phone && !isValidPhone(newTenant.admin_phone)) {
      toast.error("Telefone inválido", {
        description: "O telefone deve ter 10 ou 11 dígitos"
      });
      return;
    }

    setIsCreating(true);
    const toastId = toast.loading("Criando tenant e enviando convite...");
    
    try {
      // 1. Criar tenant
      const { data: tenant, error: tenantError } = await supabase
        .from("clients")
        .insert({
          name: newTenant.name,
          cnpj: newTenant.cnpj || null,
          domain: newTenant.domain.toLowerCase(),
          tenant_type: "customer",
          is_active: true,
          status: "ativo",
          max_users: newTenant.max_users,
          contract_start_date: new Date().toISOString().split('T')[0],
          sla_db_p1_first_response: 15, sla_db_p1_resolution: 240,
          sla_db_p2_first_response: 30, sla_db_p2_resolution: 480,
          sla_db_p3_first_response: 240, sla_db_p3_resolution: 2880,
          sla_db_p4_first_response: 1400, sla_db_p4_resolution: 4320,
          sla_app_p1_first_response: 15, sla_app_p1_resolution: 240,
          sla_app_p2_first_response: 30, sla_app_p2_resolution: 480,
          sla_app_p3_first_response: 240, sla_app_p3_resolution: 2880,
          sla_app_p4_first_response: 1400, sla_app_p4_resolution: 4320,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 2. Convidar usuário administrador via edge function
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-user', {
        body: {
          email: newTenant.admin_email,
          full_name: newTenant.admin_name,
          phone: newTenant.admin_phone ? cleanPhone(newTenant.admin_phone) : undefined,
          tenant_id: tenant.id,
          role: 'user'
        }
      });

      // 3. Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });

      // 4. Feedback e navegação
      if (inviteError) {
        console.error('Erro ao enviar convite:', inviteError);
        toast.warning(
          `Tenant "${newTenant.name}" criado! Redirecionando...`,
          { 
            id: toastId,
            description: 'Houve um erro ao enviar o convite. Você pode reenviá-lo na página do tenant.'
          }
        );
      } else {
        toast.success(
          `Tenant "${newTenant.name}" criado com sucesso! Redirecionando...`, 
          {
            id: toastId,
            description: `Email de convite enviado para ${newTenant.admin_email}`,
          }
        );
      }

      // 5. Fechar dialog e resetar form
      setIsCreateDialogOpen(false);
      setNewTenant({
        name: "",
        cnpj: "",
        domain: "",
        admin_email: "",
        admin_name: "",
        max_users: 10,
        admin_phone: "",
      });

      // 6. Navegar para a página do tenant criado
      setTimeout(() => {
        navigate(`/admin/tenants/${tenant.id}`);
      }, 1500);

    } catch (error: any) {
      toast.error("Erro ao criar tenant", {
        id: toastId,
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleTenantStatus = async (tenantId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("clients")
        .update({ is_active: !currentStatus })
        .eq("id", tenantId);

      if (error) throw error;

      toast.success(`Tenant ${!currentStatus ? "ativado" : "desativado"} com sucesso`);
      refetch();
    } catch (error: any) {
      toast.error("Erro ao alterar status do tenant", {
        description: error.message,
      });
    }
  };

  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      // 1. Buscar todos os profiles associados ao tenant
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("client_id", tenantId);

      if (profilesError) throw profilesError;

      // 2. Deletar cada usuário do Supabase Auth
      let deletedUsersCount = 0;
      if (profiles && profiles.length > 0) {
        for (const profile of profiles) {
          try {
            // Deletar do Auth via edge function (server-side authorization)
            const { data: deleteResult, error: authDeleteError } = await supabase.functions.invoke("manage-user", {
              body: { action: "delete", userId: profile.id }
            });
            
            if (authDeleteError) {
              console.error(`Erro ao deletar usuário ${profile.full_name}:`, authDeleteError);
            } else {
              deletedUsersCount++;
            }
          } catch (err) {
            console.error(`Erro ao deletar usuário ${profile.full_name}:`, err);
          }
        }
      }

      // 3. Deletar user_roles órfãos (se houver)
      const { error: rolesError } = await supabase
        .from("user_roles")
        .delete()
        .eq("tenant_id", tenantId);

      if (rolesError) console.error("Erro ao deletar user_roles:", rolesError);

      // 4. Deletar o tenant (CASCADE irá deletar o resto)
      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", tenantId);

      if (deleteError) throw deleteError;

      return { tenantId, deletedUsers: deletedUsersCount };
    },
    onSuccess: (data) => {
      toast.success("Tenant removido com sucesso", {
        description: `Tenant e ${data.deletedUsers} usuário(s) foram deletados permanentemente.`,
      });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao remover tenant", {
        description: error.message,
      });
    },
  });

  const handleDeleteClick = (tenant: Tenant, e: React.MouseEvent) => {
    e.stopPropagation();
    setTenantToDelete(tenant);
    setConfirmText("");
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tenantToDelete) return;

    if (!isSuperAdmin) {
      toast.error("Acesso negado", {
        description: "Apenas super administradores podem remover tenants."
      });
      return;
    }

    if (tenantToDelete.tenant_type === 'otimizzo') {
      toast.error("Ação não permitida", {
        description: "O tenant Otimizzo não pode ser removido."
      });
      return;
    }

    if (confirmText !== tenantToDelete.name) {
      toast.error("O nome digitado não corresponde ao tenant");
      return;
    }

    await deleteTenantMutation.mutateAsync(tenantToDelete.id);
    setIsDeleteDialogOpen(false);
    setTenantToDelete(null);
    setConfirmText("");
  };


  if (!isSuperAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Acesso Negado</CardTitle>
              <CardDescription>
                Você não tem permissão para acessar esta página.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Tenants</h1>
            <p className="text-muted-foreground">
              Administração de clientes e configuração de acessos
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Tenant</DialogTitle>
                <DialogDescription>
                  Crie um novo cliente/tenant no sistema. Um email de convite será enviado automaticamente para o administrador inicial.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Nome do Tenant */}
                <div className="space-y-2">
                  <Label htmlFor="tenant-name">Nome do Tenant *</Label>
                  <Input
                    id="tenant-name"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Sec4File"
                    required
                  />
                </div>

                {/* CNPJ */}
                <div className="space-y-2">
                  <Label htmlFor="tenant-cnpj">CNPJ (opcional)</Label>
                  <Input
                    id="tenant-cnpj"
                    value={newTenant.cnpj}
                    onChange={(e) => setNewTenant(prev => ({ ...prev, cnpj: formatCnpj(e.target.value) }))}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    inputMode="numeric"
                  />
                </div>

                {/* Domínio */}
                <div className="space-y-2">
                  <Label htmlFor="tenant-domain">Domínio do Email *</Label>
                  <Input
                    id="tenant-domain"
                    value={newTenant.domain}
                    onChange={(e) => setNewTenant(prev => ({ ...prev, domain: e.target.value.toLowerCase() }))}
                    placeholder="Ex: sec4file.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Usuários com este domínio serão automaticamente associados a este tenant
                  </p>
                </div>

                {/* Contato do Cliente */}
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-sm">Contato do Cliente</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="admin-name">Nome Completo *</Label>
                    <Input
                      id="admin-name"
                      value={newTenant.admin_name}
                      onChange={(e) => setNewTenant(prev => ({ ...prev, admin_name: e.target.value }))}
                      placeholder="João Silva"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email *</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={newTenant.admin_email}
                      onChange={(e) => setNewTenant(prev => ({ ...prev, admin_email: e.target.value.toLowerCase() }))}
                      placeholder="contato@sec4file.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-phone">Telefone (opcional)</Label>
                    <PhoneInput
                      id="admin-phone"
                      value={newTenant.admin_phone}
                      onChange={(e) => setNewTenant(prev => ({ ...prev, admin_phone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-users">Máximo de Usuários *</Label>
                    <Input
                      id="max-users"
                      type="number"
                      min="1"
                      value={newTenant.max_users}
                      onChange={(e) => setNewTenant(prev => ({ ...prev, max_users: parseInt(e.target.value) || 10 }))}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    ℹ️ Um email de convite será enviado automaticamente para este contato após a criação do tenant.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateTenant} disabled={isCreating}>
                  {isCreating ? "Criando..." : "Criar Tenant"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants?.map((tenant) => (
              <Card 
                key={tenant.id} 
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{tenant.name}</CardTitle>
                        {tenant.cnpj && (
                          <CardDescription className="text-xs">{formatCnpj(tenant.cnpj)}</CardDescription>
                        )}
                      </div>
                    </div>
                    {tenant.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={tenant.tenant_type === 'otimizzo' ? 'default' : 'secondary'}>
                      {tenant.tenant_type === 'otimizzo' ? 'Otimizzo' : 'Cliente'}
                    </Badge>
                    <Badge variant="outline">
                      {tenant.segments.join(' + ')}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Máx: {tenant.max_users} usuários</span>
                  </div>

                  {tenant.contract_start_date && (
                    <p className="text-xs text-muted-foreground">
                      Contrato: {new Date(tenant.contract_start_date).toLocaleDateString('pt-BR')}
                      {tenant.contract_end_date && ` - ${new Date(tenant.contract_end_date).toLocaleDateString('pt-BR')}`}
                    </p>
                  )}

                  {tenant.tenant_type !== 'otimizzo' && (
                    <div className="flex gap-2">
                      <Button
                        variant={tenant.is_active ? "outline" : "default"}
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTenantStatus(tenant.id, tenant.is_active);
                        }}
                      >
                        {tenant.is_active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => handleDeleteClick(tenant, e)}
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
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Remoção de Tenant
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold text-foreground">
                Você está prestes a remover o tenant "{tenantToDelete?.name}".
              </p>
              
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 space-y-2">
                <p className="font-medium text-destructive text-sm">⚠️ Esta ação é IRREVERSÍVEL e irá deletar:</p>
                <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                  <li>• Todos os tickets do tenant</li>
                  <li>• Todas as máquinas cadastradas</li>
                  <li>• Todas as instâncias de banco de dados</li>
                  <li>• Todas as instâncias de aplicação</li>
                  <li>• Todos os contatos cadastrados</li>
                  <li>• Todas as associações de usuários (roles)</li>
                </ul>
              </div>

              <p className="text-sm">
                Para confirmar, digite o nome do tenant:{" "}
                <span className="font-mono font-bold text-foreground">{tenantToDelete?.name}</span>
              </p>

              <Input
                placeholder={`Digite "${tenantToDelete?.name}" para confirmar`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="font-mono"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTenantMutation.isPending}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={confirmText !== tenantToDelete?.name || deleteTenantMutation.isPending}
            >
              {deleteTenantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover Permanentemente
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
