import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions, UserPermission } from "@/hooks/useUserPermissions";
import { RoleCheckboxGroup, getRolesLabel } from "@/components/tenants/RoleCheckboxGroup";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Search, Info, Building2, Users, Edit2, AlertTriangle } from "lucide-react";

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

// Labels curtos para badges no accordion
const roleShortLabels: Record<string, string> = {
  super_admin: "Super Admin",
  tenant_admin: "Admin",
  analyst_db: "DB",
  analyst_app: "APP",
  user: "User"
};

// Ordem de exibição das roles
const roleOrder = ["super_admin", "tenant_admin", "analyst_db", "analyst_app", "user"];

const UserPermissions = () => {
  const { user: currentUser } = useAuth();
  const [filters, setFilters] = useState({
    tenantId: "all",
    role: "all",
    status: "all",
    search: "",
  });
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    user: UserPermission | null;
    selectedRoles: string[];
  }>({
    open: false,
    user: null,
    selectedRoles: [],
  });

  const { users, isLoading, updateRoles, isUpdating } = useUserPermissions(filters);

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

  // Contar roles por grupo de usuários (um usuário pode ser contado em múltiplas roles)
  const countRolesByClient = (clientUsers: UserPermission[]): Record<string, number> => {
    const roleCounts: Record<string, number> = {};
    clientUsers.forEach((user) => {
      user.roles.forEach(role => {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });
    });
    return roleCounts;
  };

  const groupedUsers = groupUsersByClient();
  const clientNames = Object.keys(groupedUsers).sort();

  const openEditDialog = (user: UserPermission) => {
    setEditDialog({
      open: true,
      user,
      selectedRoles: [...user.roles],
    });
  };

  const handleSaveRoles = () => {
    if (editDialog.user && editDialog.selectedRoles.length > 0) {
      updateRoles({
        userId: editDialog.user.id,
        newRoles: editDialog.selectedRoles,
      });
      setEditDialog({ open: false, user: null, selectedRoles: [] });
    }
  };

  // Detectar se está adicionando ou removendo super_admin
  const hasSuperAdminChange = editDialog.user && (
    (editDialog.selectedRoles.includes("super_admin") && !editDialog.user.roles.includes("super_admin")) ||
    (!editDialog.selectedRoles.includes("super_admin") && editDialog.user.roles.includes("super_admin"))
  );

  // Detectar se o usuário atual é Super Admin editando a si mesmo
  const isEditingSelf = editDialog.user?.id === currentUser?.id;
  const isSelfSuperAdmin = isEditingSelf && editDialog.user?.roles.includes("super_admin");
  const disabledRolesForSelf = isSelfSuperAdmin ? ["super_admin"] : [];

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
              <SelectValue placeholder="Todas as funções" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
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
                                Funções
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">Usuários podem ter múltiplas funções</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
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
                                  <div className="flex flex-wrap gap-1">
                                    {user.roles.length === 0 ? (
                                      <Badge variant="outline" className="text-muted-foreground">
                                        Sem função
                                      </Badge>
                                    ) : (
                                      user.roles
                                        .sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b))
                                        .map((role) => (
                                          <Badge 
                                            key={role} 
                                            variant={getRoleBadgeVariant(role)}
                                            className="text-xs"
                                          >
                                            {getRoleLabel(role)}
                                          </Badge>
                                        ))
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={user.is_active ? "default" : "outline"}>
                                    {user.is_active ? "Ativo" : "Inativo"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(user)}
                                    disabled={isUpdating}
                                  >
                                    <Edit2 className="h-4 w-4 mr-1" />
                                    {isCurrentUser ? "Editar (Você)" : "Editar"}
                                  </Button>
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

      {/* Dialog de Edição de Permissões */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => !open && setEditDialog({ open: false, user: null, selectedRoles: [] })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Permissões</DialogTitle>
            <DialogDescription>
              <span className="font-semibold">{editDialog.user?.full_name}</span>
              <br />
              <span className="text-xs">{editDialog.user?.email}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <RoleCheckboxGroup
              selectedRoles={editDialog.selectedRoles}
              onRolesChange={(roles) => setEditDialog(prev => ({ ...prev, selectedRoles: roles }))}
              disabled={isUpdating}
              disabledRoles={disabledRolesForSelf}
            />

            {isSelfSuperAdmin && (
              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md flex items-start gap-2">
                <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Proteção Ativa</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Você não pode remover sua própria permissão de Super Admin. 
                    Isso evita que você perca acesso administrativo ao sistema.
                  </p>
                </div>
              </div>
            )}

            {hasSuperAdminChange && !isEditingSelf && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Atenção</p>
                  <p className="text-sm text-destructive">
                    Você está {editDialog.selectedRoles.includes("super_admin") ? "adicionando" : "removendo"} 
                    {" "}a função de Super Admin. Super Admins têm acesso total ao sistema.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, user: null, selectedRoles: [] })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRoles}
              disabled={isUpdating || editDialog.selectedRoles.length === 0}
            >
              {isUpdating ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserPermissions;
