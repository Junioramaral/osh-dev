import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import NewTicketDialog from "@/components/tickets/NewTicketDialog";
import { calculateSLAStatus, getPriorityColor, getStatusColor } from "@/lib/ticketUtils";

export default function Tickets() {
  const { profile, tenantId, hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  // Check if user is from Otimizzo tenant
  const { data: currentTenant } = useQuery({
    queryKey: ["current-tenant", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, tenant_type")
        .eq("id", tenantId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const isOtimizzoUser = currentTenant?.tenant_type === 'otimizzo';

  // Fetch all clients (only for Otimizzo users)
  const { data: allClients } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: isOtimizzoUser,
  });

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets", profile?.id],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select(`
          *,
          clients(name),
          sla_first_response_deadline,
          sla_resolution_deadline,
          sla_first_response_met,
          sla_resolution_met,
          first_response_at,
          resolved_at
        `)
        .order("created_at", { ascending: false });

      // RBAC: Filter by tenant_id (RLS handles this automatically now)
      // But we can still apply filters for specific roles
      
      // Analysts see only their segment
      if (hasRole('analyst_db')) {
        query = query.eq("segment", "DB");
      }
      if (hasRole('analyst_app')) {
        query = query.eq("segment", "APP");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch = 
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesSegment = segmentFilter === "all" || ticket.segment === segmentFilter;
    const matchesClient = clientFilter === "all" || ticket.client_id === clientFilter;
    return matchesSearch && matchesStatus && matchesSegment && matchesClient;
  }).sort((a, b) => {
    // Ordenar por urgência de SLA
    const slaA = calculateSLAStatus(a);
    const slaB = calculateSLAStatus(b);
    const priority = { overdue: 0, warning: 1, 'on-time': 2, met: 3, 'not-applicable': 4 };
    return priority[slaA.type] - priority[slaB.type];
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tickets</h1>
            <p className="text-muted-foreground">Gerencie todos os chamados do sistema</p>
          </div>
          <Button onClick={() => setIsNewTicketOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Ticket
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="em-atendimento">Em Atendimento</SelectItem>
              <SelectItem value="aguardando">Aguardando</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
              <SelectItem value="fechado">Fechado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Segmentos</SelectItem>
              <SelectItem value="DB">DB</SelectItem>
              <SelectItem value="APP">APP</SelectItem>
            </SelectContent>
          </Select>

          {isOtimizzoUser && (
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {allClients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-[200px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTickets && filteredTickets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTickets.map((ticket) => {
              const slaStatus = calculateSLAStatus(ticket);
              
              return (
                <Card 
                  key={ticket.id} 
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${slaStatus.borderClass}`}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">{ticket.ticket_number}</CardTitle>
                        <p className="text-sm text-muted-foreground line-clamp-2">{ticket.title}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end ml-2">
                        <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        {slaStatus.type !== 'not-applicable' && (
                          <Badge variant="outline" className={`${slaStatus.color} flex items-center gap-1 whitespace-nowrap`}>
                            {slaStatus.icon}
                            <span className="text-xs">{slaStatus.label}</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Indicador de SLA com barra de progresso */}
                    {slaStatus.type !== 'not-applicable' && slaStatus.percentage !== undefined && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-medium">
                            {!ticket.first_response_at ? 'SLA 1ª Resposta' : 'SLA Resolução'}
                          </span>
                          <span className={`font-medium ${
                            slaStatus.type === 'overdue' ? 'text-red-600' : 
                            slaStatus.type === 'warning' ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {slaStatus.timeRemaining}
                          </span>
                        </div>
                        <Progress 
                          value={slaStatus.percentage} 
                          className={`h-2 ${
                            slaStatus.type === 'overdue' ? '[&>div]:bg-red-500' : 
                            slaStatus.type === 'warning' ? '[&>div]:bg-yellow-500' : 
                            '[&>div]:bg-green-500'
                          }`}
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                      <Badge variant="outline">
                        {ticket.segment}
                      </Badge>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">
                        Cliente: <span className="text-foreground font-medium">{ticket.clients?.name}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Criado: {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum ticket encontrado</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchTerm || statusFilter !== "all" || segmentFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Crie seu primeiro ticket para começar"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <NewTicketDialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen} />
    </AppLayout>
  );
}
