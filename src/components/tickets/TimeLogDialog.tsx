import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock, AlertTriangle, FolderOpen, Inbox, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTimeLogMutations } from "@/hooks/useTimeLogMutations";
import { useClientProjects } from "@/hooks/useClientProjects";
import { useTicketTimeLogs, type TicketTimeLogRow } from "@/hooks/useTicketTimeLogs";
import { TimeLogEditDialog } from "@/components/tickets/TimeLogEditDialog";
import { TimeLogDeleteDialog } from "@/components/tickets/TimeLogDeleteDialog";
import { getTimeLogPermissions } from "@/lib/timeLogPermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

interface TimeLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    ticket_number: string;
    title: string;
    client_id: string;
  };
}

// Business hours constants
const BUSINESS_START_MINUTES = 8 * 60; // 08:00 = 480 minutes
const BUSINESS_END_MINUTES = 18 * 60 + 30; // 18:30 = 1110 minutes

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateHours(startTime: string, endTime: string): number {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  return (endMinutes - startMinutes) / 60;
}

function isWithinBusinessHours(startTime: string, endTime: string): boolean {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  return startMinutes >= BUSINESS_START_MINUTES && endMinutes <= BUSINESS_END_MINUTES;
}

export function TimeLogDialog({ open, onOpenChange, ticket }: TimeLogDialogProps) {
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [workDate, setWorkDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [projectId, setProjectId] = useState<string>("");
  const [description, setDescription] = useState("");
  
  const { addTimeLog } = useTimeLogMutations();
  const { data: projects, isLoading: loadingProjects } = useClientProjects(ticket.client_id);
  const { data: timeLogs, isLoading: loadingLogs } = useTicketTimeLogs(
    ticket.id,
    open && activeTab === "history"
  );

  // Calculate derived values
  const calculatedHours = useMemo(() => {
    return calculateHours(startTime, endTime);
  }, [startTime, endTime]);

  const isOutsideBusinessHours = useMemo(() => {
    return !isWithinBusinessHours(startTime, endTime);
  }, [startTime, endTime]);

  // Filter projects based on business hours
  const availableProjects = useMemo(() => {
    if (!projects) return [];
    
    // Only show active projects
    const activeProjects = projects.filter(p => p.is_active);
    
    if (isOutsideBusinessHours) {
      // Outside business hours: only show overtime projects
      return activeProjects.filter(p => p.is_overtime);
    }
    
    // Within business hours: show all projects
    return activeProjects;
  }, [projects, isOutsideBusinessHours]);

  // Validation
  const isValidTimeRange = calculatedHours > 0 && calculatedHours <= 24;
  const requiresOvertimeProject = isOutsideBusinessHours;
  const hasValidProject = !requiresOvertimeProject || (projectId && projectId.length > 0);
  const isFormValid = isValidTimeRange && hasValidProject;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) return;

    await addTimeLog.mutateAsync({
      ticketId: ticket.id,
      projectId: projectId || undefined,
      workDate: format(workDate, "yyyy-MM-dd"),
      startTime,
      endTime,
      hours: calculatedHours,
      description: description.trim() || undefined,
    });

    // Reset form and close dialog
    setWorkDate(new Date());
    setStartTime("08:00");
    setEndTime("18:00");
    setProjectId("");
    setDescription("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setWorkDate(new Date());
      setStartTime("08:00");
      setEndTime("18:00");
      setProjectId("");
      setDescription("");
      setActiveTab("new");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Registrar Horas Trabalhadas
          </DialogTitle>
          <DialogDescription className="break-words">
            Ticket #{ticket.ticket_number} - {ticket.title}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "new" | "history")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">Novo Registro</TabsTrigger>
            <TabsTrigger value="history">Registros</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>
              Data do Trabalho <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !workDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {workDate ? (
                    format(workDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={workDate}
                  onSelect={(date) => date && setWorkDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">
                Hora Inicial <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">
                Hora Final <span className="text-destructive">*</span>
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Calculated Hours */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Total calculado:</span>
            <span className={cn(
              "text-lg font-bold",
              isValidTimeRange ? "text-primary" : "text-destructive"
            )}>
              {isValidTimeRange ? `${calculatedHours.toFixed(1)} horas` : "Inválido"}
            </span>
          </div>

          {/* Overtime Alert */}
          {isOutsideBusinessHours && (
            <Alert variant="destructive" className="border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                Horário fora do comercial detectado (antes de 8h ou após 18:30).
                <br />
                <strong>Selecione um projeto de hora-extra.</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Project Selector */}
          <div className="space-y-2">
            <Label>
              Projeto {requiresOvertimeProject && <span className="text-destructive">*</span>}
            </Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder={
                  loadingProjects 
                    ? "Carregando projetos..." 
                    : availableProjects.length === 0
                      ? "Nenhum projeto disponível"
                      : "Selecione um projeto..."
                } />
              </SelectTrigger>
              <SelectContent>
                {!requiresOvertimeProject && (
                  <SelectItem value="none">Nenhum (não vincular a projeto)</SelectItem>
                )}
                {availableProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <span>{project.name}</span>
                      {project.is_overtime && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                          HE
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isOutsideBusinessHours && availableProjects.length === 0 && (
              <p className="text-xs text-destructive">
                Nenhum projeto de hora-extra cadastrado para este cliente.
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Trabalho</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva brevemente o trabalho realizado..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={addTimeLog.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || addTimeLog.isPending}
            >
              {addTimeLog.isPending ? "Registrando..." : "Registrar Horas"}
            </Button>
          </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <TicketTimeLogsHistory
              logs={timeLogs}
              isLoading={loadingLogs}
              ticketId={ticket.id}
              clientId={ticket.client_id}
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface GroupedLogs {
  key: string;
  projectId: string | null;
  projectName: string;
  isOvertime: boolean;
  total: number;
  logs: TicketTimeLogRow[];
}

function TicketTimeLogsHistory({
  logs,
  isLoading,
  ticketId,
  clientId,
}: {
  logs: TicketTimeLogRow[] | undefined;
  isLoading: boolean;
  ticketId: string;
  clientId: string;
}) {
  const { user } = useAuth();
  const { isTenantAdmin } = useTenant();
  const [editingLog, setEditingLog] = useState<TicketTimeLogRow | null>(null);
  const [deletingLog, setDeletingLog] = useState<TicketTimeLogRow | null>(null);

  const { grouped, total, count } = useMemo(() => {
    const list = logs ?? [];
    const map = new Map<string, GroupedLogs>();
    for (const log of list) {
      const key = log.project_id ?? "__none__";
      if (!map.has(key)) {
        map.set(key, {
          key,
          projectId: log.project_id,
          projectName: log.project_name ?? "Sem projeto",
          isOvertime: log.project_is_overtime,
          total: 0,
          logs: [],
        });
      }
      const grp = map.get(key)!;
      grp.total += log.hours;
      grp.logs.push(log);
    }
    const groupedArr = Array.from(map.values()).sort((a, b) => {
      if (!a.projectId && b.projectId) return 1;
      if (a.projectId && !b.projectId) return -1;
      return a.projectName.localeCompare(b.projectName);
    });
    const totalSum = list.reduce((acc, l) => acc + l.hours, 0);
    return { grouped: groupedArr, total: totalSum, count: list.length };
  }, [logs]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <Inbox className="h-10 w-10 mb-2 opacity-50" />
        <p className="text-sm">Nenhum registro de horas para este ticket ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Total do ticket</span>
          <span className="text-xs text-muted-foreground">
            {count} {count === 1 ? "registro" : "registros"}
          </span>
        </div>
        <span className="text-lg font-bold text-primary">{total.toFixed(1)} horas</span>
      </div>

      <ScrollArea className="max-h-[55vh] pr-2">
        <div className="space-y-3">
          {grouped.map((group) => (
            <div key={group.key} className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/60">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{group.projectName}</span>
                  {group.isOvertime && (
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                      HE
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">
                  {group.total.toFixed(1)} h
                </span>
              </div>
              <ul className="divide-y">
                {group.logs.map((log) => {
                  const perms = getTimeLogPermissions(
                    { analyst_id: log.analyst_id, logged_at: log.logged_at },
                    user?.id,
                    isTenantAdmin,
                  );
                  return (
                    <li key={log.id} className="px-3 py-2 text-sm min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                          <span className="font-medium text-foreground">
                            {format(new Date(log.work_date + "T00:00:00"), "dd/MM/yyyy")}
                          </span>
                          {log.start_time && log.end_time && (
                            <span className="text-xs">
                              {log.start_time.slice(0, 5)}–{log.end_time.slice(0, 5)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold whitespace-nowrap">{log.hours.toFixed(1)} h</span>
                          {perms.canEdit && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Editar registro"
                              onClick={() => setEditingLog(log)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {perms.canDelete && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="Excluir registro"
                              onClick={() => setDeletingLog(log)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 break-words">
                        {log.analyst_name}
                        {log.description ? ` • ${log.description}` : ""}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </ScrollArea>

      <TimeLogEditDialog
        open={!!editingLog}
        onOpenChange={(o) => !o && setEditingLog(null)}
        log={
          editingLog
            ? {
                id: editingLog.id,
                hours: editingLog.hours,
                description: editingLog.description ?? undefined,
                logged_at: editingLog.logged_at,
                ticketId,
                clientId,
                project_id: editingLog.project_id,
                work_date: editingLog.work_date,
                start_time: editingLog.start_time ?? undefined,
                end_time: editingLog.end_time ?? undefined,
              }
            : null
        }
      />

      <TimeLogDeleteDialog
        open={!!deletingLog}
        onOpenChange={(o) => !o && setDeletingLog(null)}
        log={
          deletingLog
            ? {
                id: deletingLog.id,
                hours: deletingLog.hours,
                description: deletingLog.description ?? undefined,
                logged_at: deletingLog.logged_at,
                ticketId,
              }
            : null
        }
      />
    </div>
  );
}
