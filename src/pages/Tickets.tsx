import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, AlertCircle, ListOrdered } from "lucide-react";
import NewTicketDialog from "@/components/tickets/NewTicketDialog";
import { TicketRow } from "@/components/tickets/TicketRow";
import { calculateSLAStatus } from "@/lib/ticketUtils";
import { BulkActionsBar } from "@/components/tickets/BulkActionsBar";
import { BulkAssignAnalystDialog } from "@/components/tickets/BulkAssignAnalystDialog";
import { BulkAssignTeamDialog } from "@/components/tickets/BulkAssignTeamDialog";
import { BulkAssignQueueDialog } from "@/components/tickets/BulkAssignQueueDialog";
import { BulkStatusReasonDialog } from "@/components/tickets/BulkStatusReasonDialog";
import { TicketLockedWarningDialog } from "@/components/tickets/TicketLockedWarningDialog";
import { ReleaseTicketDialog } from "@/components/tickets/ReleaseTicketDialog";
import { useBulkTicketActions } from "@/hooks/useBulkTicketActions";
import { cn } from "@/lib/utils";

export default function Tickets() {
  const { profile, tenantId, hasRole, isSuperAdmin, isOtimizzoUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [queueFilter, setQueueFilter] = useState<string>("all");
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [showAssignAnalystDialog, setShowAssignAnalystDialog] = useState(false);
  const [showAssignTeamDialog, setShowAssignTeamDialog] = useState(false);
  const [showAssignQueueDialog, setShowAssignQueueDialog] = useState(false);
  const [showStatusReasonDialog, setShowStatusReasonDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");

  // Estados para o sistema de lock/warning
  const [showLockedWarningDialog, setShowLockedWarningDialog] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [lockedTicketInfo, setLockedTicketInfo] = useState<{ lockedByName: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<"lock" | "assign" | null>(null);
  const [pendingAnalystId, setPendingAnalystId] = useState<string | null>(null);

  const {
    bulkAssignAnalyst,
    bulkAssignTeam,
    bulkAssignQueue,
    bulkChangeStatus,
    bulkChangeStatusWithReason,
    bulkChangePriority,
    bulkLockTickets,
    bulkLockTicketsWithReason,
    bulkAssignAnalystWithReason,
    bulkUnlockTickets,
  } = useBulkTicketActions();

  const isClient = !isOtimizzoUser && !isSuperAdmin;

  const toggleTicketSelection = (ticketId: string) => {
    setSelectedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTickets.size === filteredTickets?.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(filteredTickets?.map(t => t.id) || []));
    }
  };

  // Verificar se algum ticket selecionado está locado por outro usuário
  const getLockedByOtherInfo = () => {
    const selectedTicketData = filteredTickets?.filter(t => selectedTickets.has(t.id)) || [];
    const lockedByOther = selectedTicketData.find(
      t => t.lock_status === "locked" && t.lock_owner_id !== profile?.id
    );
    
    if (lockedByOther) {
      return {
        lockedByName: lockedByOther.lock_owner?.full_name || "Outro analista",
      };
    }
    return null;
  };

  const handleBulkAssignAnalyst = (analystId: string) => {
    // Verificar se algum ticket está locado por outro usuário
    const lockedInfo = getLockedByOtherInfo();
    if (lockedInfo) {
      setLockedTicketInfo(lockedInfo);
      setPendingAction("assign");
      setPendingAnalystId(analystId);
      setShowAssignAnalystDialog(false);
      setShowLockedWarningDialog(true);
      return;
    }

    bulkAssignAnalyst.mutate({
      ticketIds: Array.from(selectedTickets),
      analystId,
    });
    setSelectedTickets(new Set());
  };

  const handleBulkAssignTeam = (teamId: string) => {
    bulkAssignTeam.mutate({
      ticketIds: Array.from(selectedTickets),
      teamId,
    });
    setSelectedTickets(new Set());
  };

  const handleBulkAssignQueue = (queueId: string | null) => {
    bulkAssignQueue.mutate({
      ticketIds: Array.from(selectedTickets),
      queueId,
    });
    setSelectedTickets(new Set());
  };

  const handleBulkChangeStatus = (status: string) => {
    // Se status for resolvido, abrir dialog de motivo (para TODOS os usuários)
    if (status === "resolvido") {
      setPendingStatus(status);
      setShowStatusReasonDialog(true);
      return;
    }
    
    bulkChangeStatus.mutate({
      ticketIds: Array.from(selectedTickets),
      status,
    });
    setSelectedTickets(new Set());
  };

  const handleStatusReasonConfirm = (reason: string) => {
    if (!profile?.id) return;
    
    bulkChangeStatusWithReason.mutate({
      ticketIds: Array.from(selectedTickets),
      status: pendingStatus,
      reason,
      userId: profile.id,
    });
    setSelectedTickets(new Set());
    setShowStatusReasonDialog(false);
    setPendingStatus("");
  };

  const handleBulkChangePriority = (priority: "P1" | "P2" | "P3" | "P4") => {
    bulkChangePriority.mutate({
      ticketIds: Array.from(selectedTickets),
      priority,
    });
    setSelectedTickets(new Set());
  };

  const handleBulkLockTickets = () => {
    if (!profile?.id) return;
    
    // Verificar se algum ticket está locado por outro usuário
    const lockedInfo = getLockedByOtherInfo();
    if (lockedInfo) {
      setLockedTicketInfo(lockedInfo);
      setPendingAction("lock");
      setShowLockedWarningDialog(true);
      return;
    }
    
    bulkLockTickets.mutate({
      ticketIds: Array.from(selectedTickets),
      userId: profile.id,
    });
    setSelectedTickets(new Set());
  };

  const handleLockedWarningProceed = (reason: string) => {
    if (!profile?.id) return;

    if (pendingAction === "lock") {
      bulkLockTicketsWithReason.mutate({
        ticketIds: Array.from(selectedTickets),
        userId: profile.id,
        reason,
      });
    } else if (pendingAction === "assign" && pendingAnalystId) {
      bulkAssignAnalystWithReason.mutate({
        ticketIds: Array.from(selectedTickets),
        analystId: pendingAnalystId,
        reason,
        userId: profile.id,
      });
    }

    setSelectedTickets(new Set());
    setShowLockedWarningDialog(false);
    setLockedTicketInfo(null);
    setPendingAction(null);
    setPendingAnalystId(null);
  };

  const handleLockedWarningCancel = () => {
    setLockedTicketInfo(null);
    setPendingAction(null);
    setPendingAnalystId(null);
  };

  const handleReleaseTickets = (removeAnalyst: boolean) => {
    bulkUnlockTickets.mutate({
      ticketIds: Array.from(selectedTickets),
      removeAnalyst,
    });
    setSelectedTickets(new Set());
  };

  // Limpar seleção com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedTickets.size > 0) {
        setSelectedTickets(new Set());
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTickets]);

  

  // Calcular o team_id comum dos tickets selecionados
  const getCommonTeamId = (): string | null => {
    if (selectedTickets.size === 0) return null;
    
    const selectedTicketData = filteredTickets?.filter(t => selectedTickets.has(t.id)) || [];
    const teamIds = selectedTicketData.map(t => t.team_id).filter(Boolean);
    
    // Se todos têm o mesmo time, retorna o ID
    if (teamIds.length > 0 && teamIds.every(id => id === teamIds[0])) {
      return teamIds[0] as string;
    }
    
    return null;
  };

  // Calcular o queue_id comum dos tickets selecionados
  const getCommonQueueId = (): string | null => {
    if (selectedTickets.size === 0) return null;
    
    const selectedTicketData = filteredTickets?.filter(t => selectedTickets.has(t.id)) || [];
    const queueIds = selectedTicketData.map(t => t.queue_id).filter(Boolean);
    
    // Se todos têm a mesma fila, retorna o ID
    if (queueIds.length > 0 && queueIds.every(id => id === queueIds[0])) {
      return queueIds[0] as string;
    }
    
    return null;
  };

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

  // Fetch all teams (only for Otimizzo/super admin users)
  const { data: allTeams } = useQuery({
    queryKey: ["all-teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, segment")
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: isOtimizzoUser || isSuperAdmin,
  });

  // Fetch all queues (only for Otimizzo/super admin users)
  const { data: allQueues } = useQuery({
    queryKey: ["all-queues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queues")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");
      
      if (error) throw error;
      return data;
    },
    enabled: isOtimizzoUser || isSuperAdmin,
  });

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets", profile?.id],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select(`
          *,
          clients(name),
          profiles!tickets_analyst_id_fkey(full_name),
          lock_owner:profiles!tickets_lock_owner_id_fkey(full_name),
          teams(id, name, segment),
          queues(id, name),
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
    const matchesTeam = 
      teamFilter === "all" || 
      (teamFilter === "none" && !ticket.team_id) || 
      ticket.team_id === teamFilter;
    const matchesQueue = 
      queueFilter === "all" || 
      (queueFilter === "none" && !ticket.queue_id) || 
      ticket.queue_id === queueFilter;
    return matchesSearch && matchesStatus && matchesSegment && matchesClient && matchesTeam && matchesQueue;
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
              <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
              <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
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

          {(isOtimizzoUser || isSuperAdmin) && (
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os times" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os times</SelectItem>
                <SelectItem value="none">Sem time atribuído</SelectItem>
                {allTeams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} ({team.segment})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Queue Filter Buttons */}
        {(isOtimizzoUser || isSuperAdmin) && allQueues && allQueues.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <ListOrdered className="h-4 w-4" />
              Filas:
            </span>
            <Badge
              variant={queueFilter === "all" ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors",
                queueFilter === "all" && "bg-primary text-primary-foreground"
              )}
              onClick={() => setQueueFilter("all")}
            >
              Todas
            </Badge>
            {allQueues.map((queue) => (
              <Badge
                key={queue.id}
                variant={queueFilter === queue.id ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  queueFilter === queue.id && "bg-primary text-primary-foreground"
                )}
                onClick={() => setQueueFilter(queue.id)}
              >
                {queue.name}
              </Badge>
            ))}
            <Badge
              variant={queueFilter === "none" ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors",
                queueFilter === "none" && "bg-muted-foreground text-background"
              )}
              onClick={() => setQueueFilter("none")}
            >
              Sem fila
            </Badge>
          </div>
        )}

        {isLoading ? (
          <Card>
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 flex-1 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </Card>
        ) : filteredTickets && filteredTickets.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedTickets.size === filteredTickets.length && filteredTickets.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Tempo de Vida</TableHead>
                  <TableHead>Título</TableHead>
                  {!isClient && <TableHead>Cliente</TableHead>}
                  <TableHead>Analista</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Fila</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TicketRow 
                    key={ticket.id} 
                    ticket={ticket}
                    isSelected={selectedTickets.has(ticket.id)}
                    onToggleSelect={() => toggleTicketSelection(ticket.id)}
                    showClientColumn={!isClient}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
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

      {selectedTickets.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedTickets.size}
          onClearSelection={() => setSelectedTickets(new Set())}
          onAssignAnalyst={() => setShowAssignAnalystDialog(true)}
          onAssignTeam={() => setShowAssignTeamDialog(true)}
          onAssignQueue={() => setShowAssignQueueDialog(true)}
          onChangeStatus={handleBulkChangeStatus}
          onChangePriority={handleBulkChangePriority}
          onLockTickets={handleBulkLockTickets}
          onReleaseTickets={!isClient ? () => setShowReleaseDialog(true) : undefined}
          isClient={isClient}
        />
      )}

      <BulkAssignAnalystDialog
        open={showAssignAnalystDialog}
        onOpenChange={setShowAssignAnalystDialog}
        onConfirm={handleBulkAssignAnalyst}
        selectedCount={selectedTickets.size}
      />

      <BulkAssignTeamDialog
        open={showAssignTeamDialog}
        onOpenChange={setShowAssignTeamDialog}
        onConfirm={handleBulkAssignTeam}
        selectedCount={selectedTickets.size}
        currentTeamId={getCommonTeamId()}
      />

      <BulkAssignQueueDialog
        open={showAssignQueueDialog}
        onOpenChange={setShowAssignQueueDialog}
        onConfirm={handleBulkAssignQueue}
        selectedCount={selectedTickets.size}
        currentQueueId={getCommonQueueId()}
      />

      <BulkStatusReasonDialog
        open={showStatusReasonDialog}
        onOpenChange={setShowStatusReasonDialog}
        status={pendingStatus}
        ticketCount={selectedTickets.size}
        onConfirm={handleStatusReasonConfirm}
      />

      <TicketLockedWarningDialog
        open={showLockedWarningDialog}
        onOpenChange={setShowLockedWarningDialog}
        lockedByName={lockedTicketInfo?.lockedByName || "Outro analista"}
        ticketCount={selectedTickets.size}
        actionType={pendingAction || "lock"}
        onCancel={handleLockedWarningCancel}
        onProceed={handleLockedWarningProceed}
      />

      <ReleaseTicketDialog
        open={showReleaseDialog}
        onOpenChange={setShowReleaseDialog}
        ticketCount={selectedTickets.size}
        onConfirm={handleReleaseTickets}
      />
    </AppLayout>
  );
}
