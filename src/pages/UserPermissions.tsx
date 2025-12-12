import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions, UserPermission } from "@/hooks/useUserPermissions";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Search, Info, Building2, Users } from "lucide-react";

// Helper para obter labels das roles
const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    super_admin: "Super Admin",
    tenant_admin: "Tenant Admin",
    analyst_db: "Analista DB",
    analyst_app: "Analista APP",
    user: "Usuário"
  };
  return labels[role] || role;
};

// Helper para obter variant do badge
const getRoleBadgeVariant = (role: string): "destructive" | "default" | "secondary" | "outline" => {
  switch (role) {
    case "super_admin":
      return "destructive";
    case "tenant_admin":
      return "default";
    case "analyst_db":
    case "analyst_app":
      return "outline";
    default:
      return "secondary";
  }
};

// Helper para obter descrição da role
const getRoleDescription = (role: string): string => {
  const descriptions: Record<string, string> = {
    super_admin: "Acesso completo ao sistema, gerencia todos os tenants e usuários",
    tenant_admin: "Administra seu tenant, gerencia usuários e configurações",
    analyst_db: "Analista de banco de dados, atende tickets de DB",
    analyst_app: "Analista de aplicação, atende tickets de APP",
    user: "Usuário padrão do tenant, pode criar e visualizar tickets"
  };
  return descriptions[role] || "";
};

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
    currentRole: "super_admin" | "tenant_admin" | "analyst_db" | "analyst_app" | "user";
    newRole: "super_admin" | "tenant_admin" | "analyst_db" | "analyst_app" | "user";
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

  // Agrupar usuários por cliente
  const groupUsersByClient = (): Record<string, UserPermission[]> => {
    if (!users) return {};
    
    const grouped: Record<string, UserPermission[]> = {};
    
    users.forEach((user) => {
      const clientName = user.client_name || "Sem Cliente";
      
      if (!grouped[clientName]) {
        grouped[clientName] = [];
      }
      
      grouped[clientName].push(user);
    });
    
    return grouped;
  };

  // Contar roles por grupo de usuários
  const countRolesByClient = (clientUsers: UserPermission[]): Record<string, number> => {
    const roleCounts: Record<string, number> = {};
    clientUsers.forEach((user) => {
      if (!roleCounts[user.role]) {
        roleCounts[user.role] = 0;
      }
      roleCounts[user.role]++;
    });
    return roleCounts;
  };

  // Labels curtos para badges
  const roleShortLabels: Record<string, string> = {
    super_admin: "Super Admin",
    tenant_admin: "Admin",
    analyst_db: "DB",
    analyst_app: "APP",
    user: "User"
  };

  // Cores distintivas para cada role
  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case "super_admin":
        return "border-red-500/50 text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-500/20";
      case "tenant_admin":
        return "border-orange-500/50 text-orange-600 bg-orange-500/10 dark:text-orange-400 dark:bg-orange-500/20";
      case "analyst_db":
        return "border-blue-500/50 text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/20";
      case "analyst_app":
        return "border-green-500/50 text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-500/20";
      case "user":
        return "border-muted-foreground/50 text-muted-foreground bg-muted/50";
      default:
        return "";
    }
  };

  // Ordem de exibição das roles
  const roleOrder = ["super_admin", "tenant_admin", "analyst_db", "analyst_app", "user"];

  const groupedUsers = groupUsersByClient();
  const clientNames = Object.keys(groupedUsers).sort();

  const handleRoleChange = (
    userId: string,
    userName: string,
    userEmail: string,
    currentRole: "super_admin" | "tenant_admin" | "analyst_db" | "analyst_app" | "user",
    newRole: "super_admin" | "tenant_admin" | "analyst_db" | "analyst_app" | "user"
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
              <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
              <SelectItem value="analyst_db">Analista DB</SelectItem>
              <SelectItem value="analyst_app">Analista APP</SelectItem>
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

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <div className="p-4">
                  <Skeleton className="h-6 w-48" />
                </div>
              </Card>
            ))}
          </div>
        ) : clientNames.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </CardContent>
          </Card>
        ) : (
          /* Accordion agrupado por Cliente */
          <Accordion type="multiple" className="space-y-4" defaultValue={[]}>
            {clientNames.map((clientName) => {
              const clientUsers = groupedUsers[clientName];
              const activeCount = clientUsers.filter(u => u.is_active).length;
              
              return (
                <AccordionItem
                  key={clientName}
                  value={clientName}
                  className="border rounded-lg overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
                    <div className="flex items-center gap-3 flex-1 flex-wrap">
                      <Building2 className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{clientName}</span>
                      
                      {/* Badges de roles */}
                      <div className="flex items-center gap-1.5 ml-2">
                        {Object.entries(countRolesByClient(clientUsers))
                          .sort((a, b) => roleOrder.indexOf(a[0]) - roleOrder.indexOf(b[0]))
                          .map(([role, count]) => (
                            <Badge 
                              key={role} 
                              variant="outline" 
                              className={`text-xs font-medium px-2 py-0.5 ${getRoleBadgeColor(role)}`}
                            >
                              {count} {roleShortLabels[role] || role}
                            </Badge>
                          ))
                        }
                      </div>
                      
                      <Badge variant="secondary" className="ml-auto mr-2">
                        {activeCount} {activeCount === 1 ? 'ativo' : 'ativos'} / {clientUsers.length} total
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    <div className="border-t">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                Role Atual
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">Níveis de permissão do sistema</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Alterar Role</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientUsers.map((user) => {
                            const isCurrentUser = user.id === currentUser?.id;
                            return (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.full_name}</TableCell>
                                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                <TableCell>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge variant={getRoleBadgeVariant(user.role)}>
                                          {getRoleLabel(user.role)}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="max-w-xs">{getRoleDescription(user.role)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={user.is_active ? "default" : "outline"}>
                                    {user.is_active ? "Ativo" : "Inativo"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Select
                                    value={user.role}
                                    onValueChange={(value: "super_admin" | "tenant_admin" | "analyst_db" | "analyst_app" | "user") =>
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
                                    <SelectTrigger className="w-[150px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="super_admin">Super Admin</SelectItem>
                                      <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                                      <SelectItem value="analyst_db">Analista DB</SelectItem>
                                      <SelectItem value="analyst_app">Analista APP</SelectItem>
                                      <SelectItem value="user">Usuário</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {isCurrentUser && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      (Você)
                                    </p>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
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
                  {confirmDialog?.currentRole && getRoleLabel(confirmDialog.currentRole)}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Nova role:</span>{" "}
                  {confirmDialog?.newRole && getRoleLabel(confirmDialog.newRole)}
                </p>
              </div>
              {confirmDialog?.newRole && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    {getRoleDescription(confirmDialog.newRole)}
                  </p>
                </div>
              )}
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
