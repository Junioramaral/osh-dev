import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalystQueues } from "@/hooks/useAnalystQueues";
import { SegmentSelect } from "@/components/common/SegmentSelect";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, AlertCircle, UserCheck, AlertTriangle, ListOrdered, ChevronDown } from "lucide-react";
import { TicketRow } from "@/components/tickets/TicketRow";

import { BulkActionsBar } from "@/components/tickets/BulkActionsBar";
import { BulkAssignAnalystDialog } from "@/components/tickets/BulkAssignAnalystDialog";
import { BulkAssignTeamDialog } from "@/components/tickets/BulkAssignTeamDialog";
import { BulkAssignQueueDialog } from "@/components/tickets/BulkAssignQueueDialog";
import { BulkStatusReasonDialog } from "@/components/tickets/BulkStatusReasonDialog";
import { RequiredFieldsBeforeResolveDialog, type RequiredFieldsValues } from "@/components/tickets/RequiredFieldsBeforeResolveDialog";
import { TicketLockedWarningDialog } from "@/components/tickets/TicketLockedWarningDialog";
import { ReleaseTicketDialog } from "@/components/tickets/ReleaseTicketDialog";
import { useBulkTicketActions } from "@/hooks/useBulkTicketActions";

export default function MyTickets() {
  const { profile, isSuperAdmin, isOtimizzoUser } = useAuth();
  const { queues: analystQueues, queueIds: analystQueueIds, shouldRestrictView, hasQueues } = useAnalystQueues();
  const [searchTerm, setSearchTerm] = useState("");
  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "rascunho", label: "Rascunho" },
    { value: "novo", label: "Novo" },
    { value: "liberado", label: "Liberado" },
    { value: "em_atendimento", label: "Em Atendimento" },
    { value: "aguardando_cliente", label: "Aguardando Cliente" },
    { value: "aguardando_aprovacao", label: "Aguardando Aprovação" },
    { value: "aprovado", label: "Aprovado" },
    { value: "resolvido", label: "Resolvido" },
    { value: "fechado", label: "Fechado" },
  ];
  const DEFAULT_STATUS_FILTERS = ["rascunho", "novo", "liberado", "em_atendimento", "aguardando_cliente", "aguardando_aprovacao", "aprovado"];
  const [statusFilters, setStatusFilters] = useState<string[]>(DEFAULT_STATUS_FILTERS);
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [showAssignAnalystDialog, setShowAssignAnalystDialog] = useState(false);
  const [showAssignTeamDialog, setShowAssignTeamDialog] = useState(false);
  const [showAssignQueueDialog, setShowAssignQueueDialog] = useState(false);
  const [showStatusReasonDialog, setShowStatusReasonDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [showRequiredFieldsDialog, setShowRequiredFieldsDialog] = useState(false);
  const [savingRequiredFields, setSavingRequiredFields] = useState(false);
  const [missingFields, setMissingFields] = useState<{ analyst: boolean; team: boolean; queue: boolean }>({
    analyst: false,
    team: false,
    queue: false,
  });
  
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
    // Se status for resolvido, abrir dialog de motivo
    if (status === "resolvido") {
      const selectedData = filteredTickets?.filter(t => selectedTickets.has(t.id)) || [];
      const missing = {
        analyst: selectedData.some(t => !t.analyst_id),
        team: selectedData.some(t => !t.team_id),
        queue: selectedData.some(t => !t.queue_id),
      };
      if (missing.analyst || missing.team || missing.queue) {
        setPendingStatus(status);
        setMissingFields(missing);
        setShowRequiredFieldsDialog(true);
        return;
      }
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

  const handleRequiredFieldsConfirm = async (values: RequiredFieldsValues) => {
    setSavingRequiredFields(true);
    try {
      const selectedData = filteredTickets?.filter(t => selectedTickets.has(t.id)) || [];
      if (values.analystId) {
        const ids = selectedData.filter(t => !t.analyst_id).map(t => t.id);
        if (ids.length > 0) {
          const { error } = await supabase
            .from("tickets")
            .update({
              analyst_id: values.analystId,
              lock_status: "locked",
              lock_owner_id: values.analystId,
              lock_at: new Date().toISOString(),
              unlocked_at: null,
            })
            .in("id", ids);
          if (error) throw error;
        }
      }
      if (values.teamId) {
        const ids = selectedData.filter(t => !t.team_id).map(t => t.id);
        if (ids.length > 0) {
          const { error } = await supabase
            .from("tickets")
            .update({ team_id: values.teamId })
            .in("id", ids);
          if (error) throw error;
        }
      }
      if (values.queueId) {
        const ids = selectedData.filter(t => !t.queue_id).map(t => t.id);
        if (ids.length > 0) {
          const { error } = await supabase
            .from("tickets")
            .update({ queue_id: values.queueId })
            .in("id", ids);
          if (error) throw error;
        }
      }
      setShowRequiredFieldsDialog(false);
      setShowStatusReasonDialog(true);
    } catch (e: any) {
      const { toast } = await import("sonner");
      toast.error("Erro ao salvar atribuições: " + e.message);
    } finally {
      setSavingRequiredFields(false);
    }
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

  const canUseBulkActions = isOtimizzoUser || isSuperAdmin;

  // Calcular o team_id comum dos tickets selecionados
  const getCommonTeamId = (): string | null => {
    if (selectedTickets.size === 0) return null;
    
    const selectedTicketData = filteredTickets?.filter(t => selectedTickets.has(t.id)) || [];
    const teamIds = selectedTicketData.map(t => t.team_id).filter(Boolean);
    
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
    
    if (queueIds.length > 0 && queueIds.every(id => id === queueIds[0])) {
      return queueIds[0] as string;
    }
    
    return null;
  };

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

  // Fetch tickets atribuídos ao usuário OU lockados pelo usuário
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
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
        .or(`analyst_id.eq.${profile.id},lock_owner_id.eq.${profile.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch = 
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilters.length === 0 ? false : statusFilters.includes(ticket.status);
    const matchesSegment = segmentFilter === "all" || ticket.segment === segmentFilter;
    const matchesTeam = 
      teamFilter === "all" || 
      (teamFilter === "none" && !ticket.team_id) || 
      ticket.team_id === teamFilter;
    const matchesType = typeFilter === "all" || ticket.record_type === typeFilter;
    const matchesQueue = !shouldRestrictView || !hasQueues || 
      !ticket.queue_id || analystQueueIds.includes(ticket.queue_id);
    return matchesSearch && matchesStatus && matchesSegment && matchesTeam && matchesType && matchesQueue;
  }).sort((a, b) => {
    // Mapeamento de prioridade por status (ativos primeiro, fechados por último)
    const statusPriority: Record<string, number> = {
      'novo': 0,
      'liberado': 0,
      'em_atendimento': 1,
      'aguardando_cliente': 2,
      'resolvido': 3,
      'fechado': 4,
    };
    
    // Nível 1: Ordenar por grupo de status
    const statusA = statusPriority[a.status] ?? 5;
    const statusB = statusPriority[b.status] ?? 5;
    
    if (statusA !== statusB) {
      return statusA - statusB;
    }
    
    // Nível 2: Dentro do mesmo grupo, ordenar por ticket_number decrescente
    const numA = parseInt(a.ticket_number, 10) || 0;
    const numB = parseInt(b.ticket_number, 10) || 0;
    return numB - numA; // Decrescente: mais novo primeiro
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Warning for analysts without queues */}
        {shouldRestrictView && !hasQueues && (
          <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você não possui filas atribuídas. Contate um administrador para configurar suas filas de atendimento.
            </AlertDescription>
          </Alert>
        )}

        {/* Queue info for analysts */}
        {shouldRestrictView && hasQueues && (
          <Alert className="border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100">
            <ListOrdered className="h-4 w-4" />
            <AlertDescription>
              Suas filas: <strong>{analystQueues.map(q => q.name).join(', ')}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Meus Tickets</h1>
            </div>
            <p className="text-muted-foreground">Tickets atribuídos a mim ou que estou trabalhando</p>
          </div>
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-between font-normal">
                <span className="truncate">
                  {statusFilters.length === 0
                    ? "Nenhum status"
                    : statusFilters.length === STATUS_OPTIONS.length
                    ? "Todos Status"
                    : statusFilters.length === 1
                    ? STATUS_OPTIONS.find((s) => s.value === statusFilters[0])?.label
                    : `${statusFilters.length} status selecionados`}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-2" align="start">
              <div className="flex items-center justify-between px-2 py-1 mb-1 border-b">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setStatusFilters(STATUS_OPTIONS.map((s) => s.value))}
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setStatusFilters([])}
                >
                  Limpar
                </button>
              </div>
              <div className="space-y-1">
                {STATUS_OPTIONS.map((opt) => {
                  const checked = statusFilters.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setStatusFilters((prev) =>
                            v
                              ? [...prev, opt.value]
                              : prev.filter((s) => s !== opt.value),
                          );
                        }}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          <SegmentSelect
            value={segmentFilter}
            onValueChange={setSegmentFilter}
            shortLabels
            className="w-[180px]"
          />

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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="ticket">Suporte</SelectItem>
              <SelectItem value="rfc">RFC</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
                  <TableHead>Cliente</TableHead>
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
                {searchTerm || statusFilters.length !== DEFAULT_STATUS_FILTERS.length || segmentFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Você não possui tickets atribuídos ou lockados no momento"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {canUseBulkActions && selectedTickets.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedTickets.size}
          onClearSelection={() => setSelectedTickets(new Set())}
          onAssignAnalyst={() => setShowAssignAnalystDialog(true)}
          onAssignTeam={() => setShowAssignTeamDialog(true)}
          onAssignQueue={() => setShowAssignQueueDialog(true)}
          onChangeStatus={handleBulkChangeStatus}
          onChangePriority={handleBulkChangePriority}
          onLockTickets={handleBulkLockTickets}
          onReleaseTickets={() => setShowReleaseDialog(true)}
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

      <RequiredFieldsBeforeResolveDialog
        open={showRequiredFieldsDialog}
        onOpenChange={setShowRequiredFieldsDialog}
        ticketCount={selectedTickets.size}
        missing={missingFields}
        onConfirm={handleRequiredFieldsConfirm}
        isLoading={savingRequiredFields}
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
