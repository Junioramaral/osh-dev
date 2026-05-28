import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Shield, ShieldCheck, ShieldOff, Trash2, Mail, Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useTenantUsers, TenantUser } from "@/hooks/useTenantUsers";
import { RoleCheckboxGroup, getRolesLabel } from "@/components/tenants/RoleCheckboxGroup";
import { QueueCheckboxGroup } from "@/components/tenants/QueueCheckboxGroup";
import { cleanPhone, isValidPhone, formatPhone } from "@/lib/phoneUtils";

interface TenantUsersManagerProps {
  tenantId: string;
  tenantDomain?: string | null;
  maxUsers?: number | null;
}

export function TenantUsersManager({ tenantId, tenantDomain, maxUsers }: TenantUsersManagerProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<TenantUser | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);

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

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteForm.email || !inviteForm.full_name) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const emailDomain = inviteForm.email.split("@")[1]?.toLowerCase();
    const domain = tenantDomain?.toLowerCase();

    if (emailDomain !== domain) {
      toast.error(`O email deve pertencer ao domínio ${domain}`, {
        description: `Email fornecido: ${inviteForm.email}`,
      });
      return;
    }

    if (inviteForm.phone && !isValidPhone(inviteForm.phone)) {
      toast.error("Telefone inválido", {
        description: "O telefone deve ter 10 ou 11 dígitos",
      });
      return;
    }

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

    const emailDomain = editUserForm.email.split("@")[1]?.toLowerCase();
    const domain = tenantDomain?.toLowerCase();

    if (emailDomain !== domain) {
      toast.error(`O email deve pertencer ao domínio ${domain}`, {
        description: `Email fornecido: ${editUserForm.email}`,
      });
      return;
    }

    if (editUserForm.phone && !isValidPhone(editUserForm.phone)) {
      toast.error("Telefone inválido", {
        description: "O telefone deve ter 10 ou 11 dígitos",
      });
      return;
    }

    const hasAnalystRole = editUserForm.roles.some((r) => r === "analyst_db" || r === "analyst_app");

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

  const getUserStatus = (user: any) => {
    if (!user.is_active) return { label: "Desativado", variant: "destructive" as const, icon: ShieldOff };
    if (!user.email_confirmed_at) return { label: "Pendente", variant: "secondary" as const, icon: Shield };
    return { label: "Ativo", variant: "default" as const, icon: ShieldCheck };
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuários</CardTitle>
              <CardDescription>
                {users?.length || 0} usuário(s) {maxUsers ? `de ${maxUsers}` : ""}
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
                    {tenantDomain && ` O email deve ser do domínio @${tenantDomain}`}
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
                      placeholder={tenantDomain ? `usuario@${tenantDomain}` : "usuario@exemplo.com"}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone (opcional)</Label>
                    <PhoneInput
                      id="phone"
                      value={inviteForm.phone}
                      onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <RoleCheckboxGroup
                    selectedRoles={inviteForm.roles}
                    onRolesChange={(roles) => setInviteForm({ ...inviteForm, roles })}
                  />
                  <Button type="submit" className="w-full" disabled={isInviting}>
                    {isInviting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Convidando...
                      </>
                    ) : (
                      "Enviar Convite"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users && users.length > 0 ? (
            <div className="w-full overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Filas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const status = getUserStatus(user);
                  const StatusIcon = status.icon;
                  return (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setUserToEdit(user);
                        setEditUserForm({
                          full_name: user.full_name,
                          email: user.email,
                          phone: user.phone ? formatPhone(user.phone) : "",
                          roles: user.roles,
                          team_id: user.team_id || "",
                          queue_ids: user.queue_ids || [],
                        });
                        setIsEditUserDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone ? formatPhone(user.phone) : "-"}</TableCell>
                      <TableCell>{getRolesLabel(user.roles)}</TableCell>
                      <TableCell>
                        {user.roles.some((r) => r === "analyst_db" || r === "analyst_app")
                          ? user.queue_names.length > 0
                            ? user.queue_names.join(", ")
                            : <span className="text-muted-foreground">—</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Abrir menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background">
                            {!user.email_confirmed_at && user.is_active && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    resendInvite(user.id);
                                  }}
                                  disabled={isResending}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Reenviar convite
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}

                            {user.is_active ? (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deactivateUser(user.id);
                                }}
                              >
                                <ShieldOff className="mr-2 h-4 w-4" />
                                Desativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  reactivateUser(user.id);
                                }}
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Ativar
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserToDelete(user.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Nenhum usuário cadastrado neste tenant.</div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Atualize as informações do usuário abaixo</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditUserSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-full-name">Nome Completo *</Label>
              <Input
                id="edit-full-name"
                value={editUserForm.full_name}
                onChange={(e) => setEditUserForm({ ...editUserForm, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editUserForm.email}
                onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                required
              />
              {tenantDomain && (
                <p className="text-xs text-muted-foreground">Email deve ser do domínio: @{tenantDomain}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <PhoneInput
                id="edit-phone"
                value={editUserForm.phone}
                onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <RoleCheckboxGroup
              selectedRoles={editUserForm.roles}
              onRolesChange={(roles) => setEditUserForm({ ...editUserForm, roles })}
            />

            {editUserForm.roles.some((r) => r === "analyst_db" || r === "analyst_app") && (
              <QueueCheckboxGroup
                selectedQueueIds={editUserForm.queue_ids}
                onQueuesChange={(queue_ids) => setEditUserForm({ ...editUserForm, queue_ids })}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário será removido permanentemente do sistema, incluindo todos os
              seus dados de autenticação. Tickets e comentários criados por este usuário serão preservados.
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
    </>
  );
}