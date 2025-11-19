import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import AppLayout from "@/components/layout/AppLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Search } from "lucide-react";

const UserPermissions = () => {
  const { user: currentUser } = useAuth();
  const [filters, setFilters] = useState({
    tenantId: "all",
    role: "all",
    status: "all",
    search: "",
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    userEmail: string;
    currentRole: "user" | "super_admin";
    newRole: "user" | "super_admin";
  } | null>(null);

  const { users, isLoading, updateRole, isUpdating } = useUserPermissions(filters);

  // Buscar lista de tenants para o filtro
  const { data: tenants = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleRoleChange = (
    userId: string,
    userName: string,
    userEmail: string,
    currentRole: "user" | "super_admin",
    newRole: "user" | "super_admin"
  ) => {
    setConfirmDialog({
      open: true,
      userId,
      userName,
      userEmail,
      currentRole,
      newRole,
    });
  };

  const confirmRoleChange = () => {
    if (confirmDialog) {
      updateRole({
        userId: confirmDialog.userId,
        newRole: confirmDialog.newRole,
      });
      setConfirmDialog(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gerenciamento de Permissões
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as permissões de acesso dos usuários do sistema
          </p>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>

          <Select
            value={filters.tenantId}
            onValueChange={(value) => setFilters({ ...filters, tenantId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os tenants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tenants</SelectItem>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.role}
            onValueChange={(value) => setFilters({ ...filters, role: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas as roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="user">Usuário</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Role Atual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-9 w-32" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.client_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "super_admin" ? "destructive" : "secondary"
                          }
                        >
                          {user.role === "super_admin" ? "Super Admin" : "Usuário"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "outline"}>
                          {user.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={user.role}
                          onValueChange={(value: "user" | "super_admin") =>
                            handleRoleChange(
                              user.id,
                              user.full_name,
                              user.email,
                              user.role,
                              value
                            )
                          }
                          disabled={isCurrentUser || isUpdating}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        {isCurrentUser && (
                          <p className="text-xs text-muted-foreground mt-1">
                            (Você não pode alterar sua própria permissão)
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog de Confirmação */}
      <AlertDialog
        open={confirmDialog?.open || false}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Permissão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a alterar a permissão de{" "}
                <strong>{confirmDialog?.userName}</strong> ({confirmDialog?.userEmail})
              </p>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">
                  <span className="font-semibold">Role atual:</span>{" "}
                  {confirmDialog?.currentRole === "super_admin"
                    ? "Super Admin"
                    : "Usuário"}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Nova role:</span>{" "}
                  {confirmDialog?.newRole === "super_admin"
                    ? "Super Admin"
                    : "Usuário"}
                </p>
              </div>
              {confirmDialog?.newRole === "super_admin" && (
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                  <p className="text-sm text-destructive font-semibold">
                    ⚠️ Atenção
                  </p>
                  <p className="text-sm text-destructive">
                    Super Admins têm acesso total ao sistema, incluindo gerenciamento
                    de todos os tenants e usuários.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirmar Alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default UserPermissions;
