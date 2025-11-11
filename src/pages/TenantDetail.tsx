import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserPlus, Shield, ShieldCheck, ShieldOff, Trash2, Mail } from "lucide-react";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const TenantDetail = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  const [inviteForm, setInviteForm] = useState({
    email: "",
    full_name: "",
    role: "user",
  });

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const {
    users,
    isLoading: usersLoading,
    inviteUser,
    isInviting,
    deactivateUser,
    reactivateUser,
    removeUser,
    resendInvite,
    isResending,
  } = useTenantUsers(tenantId);

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteUser(inviteForm, {
      onSuccess: () => {
        setIsInviteDialogOpen(false);
        setInviteForm({ email: "", full_name: "", role: "user" });
      },
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
              <p className="text-muted-foreground">CNPJ: {tenant.cnpj || "N/A"}</p>
            </div>
          </div>
          <Badge variant={tenant.is_active ? "default" : "destructive"}>
            {tenant.is_active ? "Ativo" : "Inativo"}
          </Badge>
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
                  <Badge key={seg} variant="outline">{seg}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Máximo de Usuários</p>
              <p className="font-medium">{tenant.max_users || "Ilimitado"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Usuários</CardTitle>
                <CardDescription>
                  {users?.length || 0} usuário(s) {tenant.max_users ? `de ${tenant.max_users}` : ""}
                </CardDescription>
              </div>
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Convidar Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convidar Novo Usuário</DialogTitle>
                    <DialogDescription>
                      Um email de confirmação será enviado para o usuário.
                      {tenant.domain && ` O email deve ser do domínio @${tenant.domain}`}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleInviteSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo</Label>
                      <Input
                        id="full_name"
                        value={inviteForm.full_name}
                        onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                        placeholder={tenant.domain ? `usuario@${tenant.domain}` : "usuario@exemplo.com"}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Função</Label>
                      <Select
                        value={inviteForm.role}
                        onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
                      >
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="analyst_db">Analista DB</SelectItem>
                          <SelectItem value="analyst_app">Analista APP</SelectItem>
                          <SelectItem value="tenant_admin">Admin do Tenant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={isInviting}>
                      {isInviting ? "Enviando convite..." : "Enviar Convite"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : users && users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const status = getUserStatus(user);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleLabel(user.role)}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!user.email_confirmed_at && user.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendInvite(user.id)}
                                disabled={isResending}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
                            {user.is_active ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deactivateUser(user.id)}
                              >
                                <ShieldOff className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => reactivateUser(user.id)}
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToDelete(user.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário cadastrado neste tenant.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário será removido permanentemente do sistema,
              incluindo todos os seus dados de autenticação. Tickets e comentários criados por este
              usuário serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToDelete) {
                  removeUser(userToDelete);
                  setUserToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default TenantDetail;
