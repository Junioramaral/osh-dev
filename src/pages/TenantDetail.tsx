import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserPlus, Shield, ShieldCheck, ShieldOff, Trash2, Mail, Edit, Loader2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenantUsers, TenantUser } from "@/hooks/useTenantUsers";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCnpj } from "@/lib/cnpjUtils";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { cleanPhone, isValidPhone, formatPhone } from "@/lib/phoneUtils";
import { RoleCheckboxGroup, getRolesLabel } from "@/components/tenants/RoleCheckboxGroup";
import { QueueCheckboxGroup } from "@/components/tenants/QueueCheckboxGroup";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantUserReport } from "@/components/tenants/TenantUserReport";

const TenantDetail = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isOpeningEditDialog, setIsOpeningEditDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<TenantUser | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);

  type TenantAdmin = {
    id: string;
    full_name: string;
    email: string;
  };

  const [inviteForm, setInviteForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    roles: ["user"] as string[],
  });

  const [editUserForm, setEditUserForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    roles: [] as string[],
    team_id: "" as string,
    queue_ids: [] as string[],
  });

  const [editForm, setEditForm] = useState({
    max_users: 10,
    cnpj: "",
    admin_email: "",
    admin_full_name: "",
  });

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", tenantId).single();

      if (error) throw error;
      return data;
    },
  });

  const {
    users,
    isLoading: usersLoading,
    inviteUser,
    isInviting,
    updateUser,
    isUpdating,
    deactivateUser,
    reactivateUser,
    removeUser,
    resendInvite,
    isResending,
  } = useTenantUsers(tenantId);

  // Teams query removed - now using QueueCheckboxGroup which fetches queues internally

  // Query para buscar admins do tenant
  const {
    data: tenantAdmins,
    isLoading: isLoadingAdmins,
    refetch: refetchAdmins,
  } = useQuery<TenantAdmin[]>({
    queryKey: ["tenant-admins", tenantId],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          full_name,
          user_roles!inner(role)
        `,
        )
        .eq("client_id", tenantId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Fetch email for each admin specifically in parallel (optimized)
      const adminPromises = profiles.map(async (profile) => {
        const { data, error } = await supabase.functions.invoke("manage-user", {
          body: { action: "get_user", userId: profile.id }
        });

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: data?.data?.user?.email || "",
        };
      });

      // Wait for all parallel requests
      const adminsWithEmail = await Promise.all(adminPromises);

      return adminsWithEmail;
    },
    enabled: !!tenantId,
    staleTime: 30000, // Cache por 30s
  });

  // Função para abrir dialog com prefetch dos dados
  const handleOpenEditDialog = async () => {
    setIsOpeningEditDialog(true);

    try {
      // Força refetch dos dados mais recentes
      await refetchAdmins();

      // Só abre o dialog quando os dados estiverem prontos
      setIsEditDialogOpen(true);
    } catch (error) {
      toast.error("Erro ao carregar dados do tenant");
    } finally {
      setIsOpeningEditDialog(false);
    }
  };

  // Mutation para atualizar tenant
  const updateTenantMutation = useMutation({
    mutationFn: async (updates: {
      max_users: number;
      cnpj?: string;
      admin_user_id?: string;
      admin_email?: string;
      admin_full_name?: string;
    }) => {
      // Update max_users and cnpj in tenant
      const { error: tenantError } = await supabase
        .from("clients")
        .update({
          max_users: updates.max_users,
          cnpj: updates.cnpj || null,
        })
        .eq("id", tenantId);

      if (tenantError) throw tenantError;

      // Update admin info if provided
      if (updates.admin_user_id) {
        // Update full_name in profiles
        if (updates.admin_full_name) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ full_name: updates.admin_full_name })
            .eq("id", updates.admin_user_id);

          if (profileError) throw profileError;
        }

        // Update email via edge function (server-side authorization)
        if (updates.admin_email) {
          const { data: emailResult, error: emailError } = await supabase.functions.invoke("manage-user", {
            body: { action: "update_email", userId: updates.admin_user_id, data: { email: updates.admin_email } }
          });

          if (emailError || emailResult?.error) throw new Error(emailError?.message || emailResult?.error || "Erro ao atualizar email");
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success("Tenant atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar tenant", {
        description: error.message,
      });
    },
  });

  // Preencher formulário ao abrir dialog e carregar primeiro admin automaticamente
  useEffect(() => {
    // Preencher quando o dialog abrir (dados já estarão carregados via prefetch)
    if (isEditDialogOpen && tenant) {
      const firstAdmin = tenantAdmins?.[0];

      setEditForm({
        max_users: tenant.max_users || 10,
        cnpj: tenant.cnpj || "",
        admin_email: firstAdmin?.email || "",
        admin_full_name: firstAdmin?.full_name || "",
      });
    }
  }, [isEditDialogOpen, tenant, tenantAdmins]);

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteForm.email || !inviteForm.full_name) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Validate email domain
    const emailDomain = inviteForm.email.split("@")[1]?.toLowerCase();
    const tenantDomain = tenant?.domain?.toLowerCase();

    if (emailDomain !== tenantDomain) {
      toast.error(`O email deve pertencer ao domínio ${tenantDomain}`, {
        description: `Email fornecido: ${inviteForm.email}`,
      });
      return;
    }

    // Validate phone if provided
    if (inviteForm.phone && !isValidPhone(inviteForm.phone)) {
      toast.error("Telefone inválido", {
        description: "O telefone deve ter 10 ou 11 dígitos",
      });
      return;
    }

    // Clean phone before sending
    const cleanedForm = {
      email: inviteForm.email,
      full_name: inviteForm.full_name,
      roles: inviteForm.roles,
      phone: inviteForm.phone ? cleanPhone(inviteForm.phone) : undefined,
    };

    inviteUser(cleanedForm, {
      onSuccess: () => {
        setIsInviteDialogOpen(false);
        setInviteForm({ email: "", full_name: "", phone: "", roles: ["user"] });
      },
    });
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userToEdit || !editUserForm.full_name || !editUserForm.email) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Validate email domain
    const emailDomain = editUserForm.email.split("@")[1]?.toLowerCase();
    const tenantDomain = tenant?.domain?.toLowerCase();

    if (emailDomain !== tenantDomain) {
      toast.error(`O email deve pertencer ao domínio ${tenantDomain}`, {
        description: `Email fornecido: ${editUserForm.email}`,
      });
      return;
    }

    // Validate phone if provided
    if (editUserForm.phone && !isValidPhone(editUserForm.phone)) {
      toast.error("Telefone inválido", {
        description: "O telefone deve ter 10 ou 11 dígitos",
      });
      return;
    }

    const hasAnalystRole = editUserForm.roles.some(r => r === 'analyst_db' || r === 'analyst_app');

    updateUser(
      {
        userId: userToEdit.id,
        full_name: editUserForm.full_name,
        email: editUserForm.email,
        phone: editUserForm.phone ? cleanPhone(editUserForm.phone) : "",
        roles: editUserForm.roles,
        team_id: hasAnalystRole ? (editUserForm.team_id || null) : null,
        queue_ids: hasAnalystRole ? editUserForm.queue_ids : [],
      },
      {
        onSuccess: () => {
          setIsEditUserDialogOpen(false);
          setUserToEdit(null);
          setEditUserForm({ full_name: "", email: "", phone: "", roles: [], team_id: "", queue_ids: [] });
        },
      }
    );
  };

  const handleEditTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de max_users
    const currentUserCount = users?.length || 0;
    if (editForm.max_users < currentUserCount) {
      toast.error("Erro de validação", {
        description: `Máximo de usuários não pode ser menor que o número atual de usuários cadastrados (${currentUserCount}).`,
      });
      return;
    }

    if (editForm.max_users <= 0) {
      toast.error("Erro de validação", {
        description: "Máximo de usuários deve ser maior que zero.",
      });
      return;
    }

    // Validar dados do admin
    if (!editForm.admin_full_name?.trim()) {
      toast.error("Erro de validação", {
        description: "Nome completo do admin é obrigatório.",
      });
      return;
    }

    if (!editForm.admin_email?.trim()) {
      toast.error("Erro de validação", {
        description: "Email do admin é obrigatório.",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.admin_email)) {
      toast.error("Erro de validação", {
        description: "Formato de email inválido.",
      });
      return;
    }

    // Validate email domain if tenant has domain configured
    if (tenant?.domain) {
      const emailDomain = editForm.admin_email.split("@")[1]?.toLowerCase();
      if (emailDomain !== tenant.domain.toLowerCase()) {
        toast.error("Erro de validação", {
          description: `Email deve ser do domínio ${tenant.domain}.`,
        });
        return;
      }
    }

    // Pegar ID do primeiro admin
    const firstAdminId = tenantAdmins?.[0]?.id;
    if (!firstAdminId) {
      toast.error("Erro de validação", {
        description: "Nenhum administrador encontrado para este tenant.",
      });
      return;
    }

    updateTenantMutation.mutate({
      max_users: editForm.max_users,
      cnpj: editForm.cnpj,
      admin_user_id: firstAdminId,
      admin_email: editForm.admin_email,
      admin_full_name: editForm.admin_full_name,
    });
  };

  const getUserStatus = (user: any) => {
    if (!user.is_active) return { label: "Desativado", variant: "destructive" as const, icon: ShieldOff };
    if (!user.email_confirmed_at) return { label: "Pendente", variant: "secondary" as const, icon: Shield };
    return { label: "Ativo", variant: "default" as const, icon: ShieldCheck };
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      super_admin: "Super Admin",
      tenant_admin: "Admin do Tenant",
      analyst_db: "Analista DB",
      analyst_app: "Analista APP",
      user: "Usuário",
    };
    return roleMap[role] || role;
  };

  if (tenantLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!tenant) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Tenant não encontrado</p>
          <Button onClick={() => navigate("/admin/tenants")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Tenants
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/tenants")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{tenant.name}</h1>
              <p className="text-muted-foreground">CNPJ: {tenant.cnpj ? formatCnpj(tenant.cnpj) : "N/A"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleOpenEditDialog} disabled={isOpeningEditDialog}>
              {isOpeningEditDialog ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Tenant
                </>
              )}
            </Button>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Editar Tenant: {tenant.name}</DialogTitle>
                  <DialogDescription>
                    Edite o máximo de usuários e os dados do administrador principal do tenant
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleEditTenantSubmit} className="space-y-6">
                  {/* Campos somente leitura */}
                  <div className="space-y-4 p-4 bg-muted/30 rounded-md border">
                    <h3 className="font-semibold text-sm">Informações do Tenant (Somente Leitura)</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Nome</Label>
                        <Input value={tenant.name} disabled className="bg-muted/50" />
                      </div>

                      <div>
                        <Label className="text-muted-foreground">Domínio</Label>
                        <Input value={tenant.domain || "N/A"} disabled className="bg-muted/50" />
                      </div>

                      <div>
                        <Label className="text-muted-foreground">Tipo</Label>
                        <Input value={tenant.tenant_type || "N/A"} disabled className="bg-muted/50" />
                      </div>
                    </div>
                  </div>

                  {/* Campos editáveis */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Campos Editáveis</h3>

                    {/* Máximo de Usuários */}
                    <div>
                      <Label htmlFor="max_users">Máximo de Usuários *</Label>
                      <Input
                        id="max_users"
                        type="number"
                        min="1"
                        value={editForm.max_users}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, max_users: parseInt(e.target.value) || 0 }))}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Atualmente: {users?.length || 0} usuário(s) cadastrado(s)
                      </p>
                    </div>

                    {/* CNPJ - Opcional */}
                    <div>
                      <Label htmlFor="cnpj">CNPJ (Opcional)</Label>
                      <Input
                        id="cnpj"
                        value={editForm.cnpj}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, cnpj: formatCnpj(e.target.value) }))}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        inputMode="numeric"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Pode ser preenchido ou alterado posteriormente
                      </p>
                    </div>
                  </div>

                  {/* Dados do Administrador */}
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="font-semibold text-sm">Dados do Administrador</h3>

                    <div>
                      <Label htmlFor="admin_full_name">Nome Completo do Admin *</Label>
                      <Input
                        id="admin_full_name"
                        type="text"
                        value={editForm.admin_full_name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, admin_full_name: e.target.value }))}
                        placeholder="João Silva"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="admin_email">Email do Admin *</Label>
                      <Input
                        id="admin_email"
                        type="email"
                        value={editForm.admin_email}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, admin_email: e.target.value.toLowerCase() }))
                        }
                        placeholder="contato@otimizzo.com"
                        required
                      />
                      {tenant?.domain && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Email deve ser do domínio: @{tenant.domain}
                        </p>
                      )}
                      <p className="text-xs text-amber-600 mt-1">⚠️ Alterar o email invalidará a sessão do usuário</p>
                    </div>

                    {tenantAdmins && tenantAdmins.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ℹ️ Editando: {tenantAdmins[0]?.full_name} ({tenantAdmins[0]?.email})
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={updateTenantMutation.isPending}>
                      {updateTenantMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar Alterações"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Badge variant={tenant.is_active ? "default" : "destructive"}>
              {tenant.is_active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Tenant</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Domínio</p>
              <p className="font-medium">{tenant.domain || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <p className="font-medium">{tenant.tenant_type || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Segmentos</p>
              <div className="flex gap-2 mt-1">
                {tenant.segments?.map((seg: string) => (
                  <Badge key={seg} variant="outline">
                    {seg}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Máximo de Usuários</p>
              <p className="font-medium">{tenant.max_users || "Ilimitado"}</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
};

export default TenantDetail;
