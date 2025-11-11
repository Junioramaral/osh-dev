import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Users, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: "",
    cnpj: "",
    domain: "",
    segments: [] as string[],
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
    if (!newTenant.name || !newTenant.domain || !newTenant.admin_email || !newTenant.admin_name || newTenant.segments.length === 0) {
      toast.error("Preencha todos os campos obrigatórios");
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
          domain: newTenant.domain,
          tenant_type: "customer",
          segments: newTenant.segments,
          is_active: true,
          status: "ativo",
          max_users: newTenant.max_users,
          contract_start_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 2. Criar usuário admin (via Supabase Admin API - requer service role)
      // Por enquanto, vamos apenas criar o tenant e avisar o usuário
      toast.success(`Tenant "${newTenant.name}" criado com sucesso!`, {
        description: `Agora você precisa criar o usuário admin manualmente no Supabase Auth para: ${newTenant.admin_email}`,
      });

      setIsCreateDialogOpen(false);
      setNewTenant({
        name: "",
        cnpj: "",
        domain: "",
        segments: [],
        admin_email: "",
        admin_name: "",
        max_users: 10,
      });
      refetch();
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

  const handleSegmentToggle = (segment: string) => {
    setNewTenant(prev => ({
      ...prev,
      segments: prev.segments.includes(segment)
        ? prev.segments.filter(s => s !== segment)
        : [...prev.segments, segment]
    }));
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
                  Preencha as informações para criar um novo tenant e seu usuário administrador
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Tenant *</Label>
                    <Input
                      id="name"
                      value={newTenant.name}
                      onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                      placeholder="Nome da Empresa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={newTenant.cnpj}
                      onChange={(e) => setNewTenant({ ...newTenant, cnpj: e.target.value })}
                      placeholder="00.000.000/0001-00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain">Domínio do Email *</Label>
                  <Input
                    id="domain"
                    value={newTenant.domain}
                    onChange={(e) => setNewTenant({ ...newTenant, domain: e.target.value.toLowerCase() })}
                    placeholder="empresa.com.br"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usuários com emails deste domínio serão automaticamente associados a este tenant
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Segmentos Contratados *</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="db"
                        checked={newTenant.segments.includes("DB")}
                        onCheckedChange={() => handleSegmentToggle("DB")}
                      />
                      <label htmlFor="db" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Banco de Dados (DB)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="app"
                        checked={newTenant.segments.includes("APP")}
                        onCheckedChange={() => handleSegmentToggle("APP")}
                      />
                      <label htmlFor="app" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Aplicações (APP)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_users">Máximo de Usuários</Label>
                  <Input
                    id="max_users"
                    type="number"
                    value={newTenant.max_users}
                    onChange={(e) => setNewTenant({ ...newTenant, max_users: parseInt(e.target.value) || 10 })}
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Usuário Administrador Inicial</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin_name">Nome Completo *</Label>
                      <Input
                        id="admin_name"
                        value={newTenant.admin_name}
                        onChange={(e) => setNewTenant({ ...newTenant, admin_name: e.target.value })}
                        placeholder="João Silva"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin_email">Email *</Label>
                      <Input
                        id="admin_email"
                        type="email"
                        value={newTenant.admin_email}
                        onChange={(e) => setNewTenant({ ...newTenant, admin_email: e.target.value })}
                        placeholder="admin@empresa.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateTenant} disabled={isCreating}>
                    {isCreating ? "Criando..." : "Criar Tenant"}
                  </Button>
                </div>
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
              <Card key={tenant.id}>
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
                      onClick={() => toggleTenantStatus(tenant.id, tenant.is_active)}
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
