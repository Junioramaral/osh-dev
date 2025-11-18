import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Users, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
    max_users: 10,
  });

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

    setIsCreating(true);
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
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 2. Convidar usuário administrador via edge function
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-user', {
        body: {
          email: newTenant.admin_email,
          full_name: newTenant.admin_name,
          tenant_id: tenant.id,
          role: 'tenant_admin'
        }
      });

      if (inviteError) {
        console.error('Erro ao enviar convite:', inviteError);
        toast.warning(
          `Tenant "${newTenant.name}" criado, mas houve um erro ao enviar o email de convite para ${newTenant.admin_email}`,
          { description: 'Você pode reenviar o convite manualmente.' }
        );
      } else {
        toast.success(`Tenant "${newTenant.name}" criado com sucesso!`, {
          description: `Email de convite enviado para ${newTenant.admin_email}`,
        });
      }

      setIsCreateDialogOpen(false);
      setNewTenant({
        name: "",
        cnpj: "",
        domain: "",
        admin_email: "",
        admin_name: "",
        max_users: 10,
      });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (error: any) {
      toast.error("Erro ao criar tenant", {
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
                    onChange={(e) => setNewTenant(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
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
                          <CardDescription className="text-xs">{tenant.cnpj}</CardDescription>
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
                    <Button
                      variant={tenant.is_active ? "destructive" : "default"}
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTenantStatus(tenant.id, tenant.is_active);
                      }}
                    >
                      {tenant.is_active ? "Desativar" : "Ativar"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
