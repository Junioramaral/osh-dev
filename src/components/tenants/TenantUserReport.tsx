import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface TenantUserReportProps {
  tenantId: string;
}

interface UserStats {
  userId: string;
  fullName: string;
  email: string;
  isActive: boolean;
  role: string;
  createdAt: string;
  lastActivity: string | null;
  ticketsCreated: number;
  commentsCreated: number;
}

export const TenantUserReport = ({ tenantId }: TenantUserReportProps) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["tenant-user-report", tenantId],
    queryFn: async () => {
      // 1. Buscar todos os usuários do tenant
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          is_active,
          created_at,
          user_roles!inner(role)
        `)
        .eq("client_id", tenantId);

      if (profilesError) throw profilesError;

      // 2. Buscar emails dos usuários via edge function
      let authUsers: any[] = [];
      try {
        const { data, error: authError } = await supabase.functions.invoke("manage-user", {
          body: { action: "list_users" }
        });
        if (!authError && data?.data?.users) {
          authUsers = data.data.users;
        }
      } catch (err) {
        console.error("Error fetching auth users:", err);
      }

      // 3. Buscar última atividade e estatísticas de uso
      const userStats: UserStats[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const authUser = authUsers?.find((u: any) => u.id === profile.id);
          
          // Buscar tickets criados
          const { count: ticketsCount } = await supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("client_id", tenantId)
            .or(`analyst_id.eq.${profile.id},lock_owner_id.eq.${profile.id}`);

          // Buscar comentários criados
          const { count: commentsCount } = await supabase
            .from("ticket_comments")
            .select("*", { count: "exact", head: true })
            .eq("author_id", profile.id);

          // Buscar última atividade (último comentário ou ticket atualizado)
          const { data: lastComment } = await supabase
            .from("ticket_comments")
            .select("created_at")
            .eq("author_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const { data: lastTicket } = await supabase
            .from("tickets")
            .select("updated_at")
            .or(`analyst_id.eq.${profile.id},lock_owner_id.eq.${profile.id}`)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();

          let lastActivity: string | null = null;
          if (lastComment && lastTicket) {
            lastActivity = new Date(lastComment.created_at) > new Date(lastTicket.updated_at)
              ? lastComment.created_at
              : lastTicket.updated_at;
          } else if (lastComment) {
            lastActivity = lastComment.created_at;
          } else if (lastTicket) {
            lastActivity = lastTicket.updated_at;
          }

          return {
            userId: profile.id,
            fullName: profile.full_name,
            email: authUser?.email || "",
            isActive: profile.is_active || false,
            role: (profile.user_roles as any)[0]?.role || "user",
            createdAt: profile.created_at || "",
            lastActivity,
            ticketsCreated: ticketsCount || 0,
            commentsCreated: commentsCount || 0,
          };
        })
      );

      // Calcular estatísticas gerais
      const activeUsers = userStats.filter((u) => u.isActive).length;
      const inactiveUsers = userStats.filter((u) => !u.isActive).length;
      const totalTickets = userStats.reduce((sum, u) => sum + u.ticketsCreated, 0);
      const totalComments = userStats.reduce((sum, u) => sum + u.commentsCreated, 0);

      return {
        users: userStats,
        summary: {
          total: userStats.length,
          active: activeUsers,
          inactive: inactiveUsers,
          totalTickets,
          totalComments,
        },
      };
    },
    enabled: !!tenantId,
  });

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      tenant_admin: "Administrador",
      analyst_db: "Analista DB",
      analyst_app: "Analista APP",
      user: "Usuário",
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "tenant_admin") return "default";
    if (role.includes("analyst")) return "secondary";
    return "outline";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.total}</div>
            <p className="text-xs text-muted-foreground">
              Cadastrados no tenant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.summary.active}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.summary.active / stats.summary.total) * 100).toFixed(0)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Inativos</CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.summary.inactive}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.summary.inactive / stats.summary.total) * 100).toFixed(0)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividade Total</CardTitle>
            <Activity className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              {stats.summary.totalComments} comentários
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Detalhes */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Usuário</CardTitle>
          <CardDescription>
            Informações detalhadas de atividade e uso de recursos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="text-center">Tickets</TableHead>
                <TableHead className="text-center">Comentários</TableHead>
                <TableHead>Última Atividade</TableHead>
                <TableHead>Cadastrado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.users.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.fullName}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"} className={
                      user.isActive 
                        ? "bg-success text-success-foreground" 
                        : "bg-muted text-muted-foreground"
                    }>
                      {user.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {user.ticketsCreated}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {user.commentsCreated}
                  </TableCell>
                  <TableCell>
                    {user.lastActivity ? (
                      <div className="text-sm">
                        {format(new Date(user.lastActivity), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem atividade</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(user.createdAt), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
