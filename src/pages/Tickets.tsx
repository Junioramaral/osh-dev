import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import NewTicketDialog from "@/components/tickets/NewTicketDialog";

export default function Tickets() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets", profile?.id],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select(`
          *,
          clients(name)
        `)
        .order("created_at", { ascending: false });

      // RBAC: Clients only see their own tickets
      if (profile?.role === "cliente" && profile.client_id) {
        query = query.eq("client_id", profile.client_id);
      }

      // Analysts see only their segment
      if (profile?.role === "analista-db") {
        query = query.eq("segment", "DB");
      }
      if (profile?.role === "analista-app") {
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
    return matchesSearch && matchesStatus && matchesSegment;
  });

  const getPriorityColor = (priority: string) => {
    const colors = {
      P1: "bg-priority-p1 text-priority-p1-foreground",
      P2: "bg-priority-p2 text-priority-p2-foreground",
      P3: "bg-priority-p3 text-priority-p3-foreground",
      P4: "bg-priority-p4 text-priority-p4-foreground",
    };
    return colors[priority as keyof typeof colors] || "bg-muted";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      novo: "bg-status-novo text-status-novo-foreground",
      "em-atendimento": "bg-status-em-atendimento text-status-em-atendimento-foreground",
      aguardando: "bg-status-aguardando text-status-aguardando-foreground",
      resolvido: "bg-status-resolvido text-status-resolvido-foreground",
      fechado: "bg-status-fechado text-status-fechado-foreground",
    };
    return colors[status as keyof typeof colors] || "bg-muted";
  };

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
            {filteredTickets.map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{ticket.ticket_number}</CardTitle>
                      <p className="text-sm text-muted-foreground">{ticket.title}</p>
                    </div>
                    <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status}
                    </Badge>
                    <Badge variant="outline">
                      {ticket.segment}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      Cliente: <span className="text-foreground">{ticket.clients?.name}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Criado: {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
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
