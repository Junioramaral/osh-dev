import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateSLAStatus, formatDuration, getStatusColor, getStatusLabel } from "@/lib/ticketUtils";
import { differenceInMinutes } from "date-fns";
import { BookOpen, ExternalLink, CheckCircle, Star, User, Clock, Timer } from "lucide-react";
import { TicketResolveDialog } from "./TicketResolveDialog";
import { TimeLogDialog } from "./TimeLogDialog";
import { useTicketActions } from "@/hooks/useTicketActions";
import { useTicketTimeLogs } from "@/hooks/useTicketDetail";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface TicketSidebarProps {
  ticket: any;
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function TicketSidebar({ ticket }: TicketSidebarProps) {
  const [showFAQDialog, setShowFAQDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showTimeLogDialog, setShowTimeLogDialog] = useState(false);
  const { profile, isViewer, isOtimizzoUser, isSuperAdmin } = useAuth();
  const { data: timeLogs } = useTicketTimeLogs(ticket.id);
  
  // Calculate total hours
  const totalHours = useMemo(() => {
    if (!timeLogs || timeLogs.length === 0) return 0;
    return timeLogs.reduce((sum, log) => sum + Number(log.hours), 0);
  }, [timeLogs]);

  const totalLogs = timeLogs?.length || 0;
  
  // Apenas analistas Otimizzo/SuperAdmin podem registrar horas (não clientes, não viewers)
  const canLogTime = (isOtimizzoUser || isSuperAdmin) && !isViewer;
  const { resolveTicketWithReason, updateTicketStatus } = useTicketActions();
  
  const slaStatus = calculateSLAStatus(ticket);
  const now = new Date();
  
  // Calculate resolution SLA if first response was given
  const resolutionSLA = ticket.first_response_at && ticket.sla_resolution_deadline ? (() => {
    const deadline = new Date(ticket.sla_resolution_deadline);
    const createdAt = new Date(ticket.created_at);
    const totalTime = differenceInMinutes(deadline, createdAt);
    const elapsed = differenceInMinutes(now, createdAt);
    const remaining = differenceInMinutes(deadline, now);
    const percentage = Math.min((elapsed / totalTime) * 100, 100);
    
    return {
      percentage,
      remaining,
      isOverdue: remaining < 0
    };
  })() : null;

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "resolvido") {
      setShowResolveDialog(true);
    } else {
      updateTicketStatus.mutate({
        ticketId: ticket.id,
        status: newStatus as any,
      });
    }
  };

  const handleResolveConfirm = async (reason: string) => {
    if (!profile?.id) return;
    await resolveTicketWithReason.mutateAsync({
      ticketId: ticket.id,
      reason,
      userId: profile.id,
    });
    setShowResolveDialog(false);
  };

  const isResolved = ticket.status === "resolvido" || ticket.status === "fechado";
  
  return (
    <div className="space-y-6">
      {/* Ticket Actions Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ações do Ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Status Atual</Label>
            <Badge className={getStatusColor(ticket.status)}>
              {getStatusLabel(ticket.status)}
            </Badge>
          </div>

          {/* Closure Info - only show if resolved/closed */}
          {isResolved && ticket.resolved_at && (
            <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Ticket Resolvido
                </span>
              </div>
              
              <div className="space-y-1.5 text-sm">
                {/* Quem encerrou - DESTACADO */}
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Por:</span>
                  <span className="font-semibold text-foreground">
                    {ticket.resolved_by || "Não registrado"}
                  </span>
                </div>
                
                {/* Data/hora */}
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Em:</span>
                  <span className="font-medium text-foreground">
                    {new Date(ticket.resolved_at).toLocaleString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).replace(',', ' às')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status Dropdown - only show if not resolved and not viewer */}
          {!isResolved && !isViewer && (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Alterar Status</Label>
                <Select
                  value={ticket.status}
                  onValueChange={handleStatusChange}
                  disabled={updateTicketStatus.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                    <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resolve Button */}
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => setShowResolveDialog(true)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolver Ticket
              </Button>
            </>
          )}

          {/* Log Time Button - visible for Otimizzo/SuperAdmin even on resolved tickets */}
          {canLogTime && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowTimeLogDialog(true)}
            >
              <Timer className="h-4 w-4 mr-2" />
              Registrar Horas
            </Button>
          )}

          {/* Viewer read-only message */}
          {isViewer && !isResolved && (
            <p className="text-xs text-purple-600 dark:text-purple-400 text-center">
              Modo somente leitura (Auditor)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Hours Summary Card - visible for Otimizzo/SuperAdmin */}
      {(isOtimizzoUser || isSuperAdmin) && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Horas Trabalhadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {totalHours.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Registros</span>
              <span className="text-sm font-medium">{totalLogs}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolve Dialog */}
      <TicketResolveDialog
        open={showResolveDialog}
        onOpenChange={setShowResolveDialog}
        ticket={{
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          title: ticket.title,
          contact_name: ticket.contact_name,
        }}
        onConfirm={handleResolveConfirm}
        isLoading={resolveTicketWithReason.isPending}
      />

      {/* Time Log Dialog */}
      <TimeLogDialog
        open={showTimeLogDialog}
        onOpenChange={setShowTimeLogDialog}
        ticket={{
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          title: ticket.title,
          client_id: ticket.client_id,
        }}
      />

      {/* CSAT Rating Card */}
      {ticket.csat_rating && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Avaliação do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-5 w-5",
                    star <= ticket.csat_rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
              <span className="ml-2 font-semibold">{ticket.csat_rating}/5</span>
            </div>
            {ticket.csat_comment && (
              <p className="mt-2 text-sm text-muted-foreground italic">
                "{ticket.csat_comment}"
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* FAQ Relacionada */}
      {ticket.faq_articles && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              FAQ Relacionada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium line-clamp-2">{ticket.faq_articles.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {ticket.faq_articles.symptoms}
            </p>
            <Button 
              variant="link" 
              size="sm" 
              className="px-0 h-auto text-xs"
              onClick={() => setShowFAQDialog(true)}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver artigo completo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* FAQ Dialog */}
      <Dialog open={showFAQDialog} onOpenChange={setShowFAQDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ticket.faq_articles?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Sintomas</Label>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {ticket.faq_articles?.symptoms}
              </p>
            </div>
            {ticket.faq_articles?.problem && (
              <div>
                <Label className="text-sm font-semibold">Problema</Label>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {ticket.faq_articles?.problem}
                </p>
              </div>
            )}
            {ticket.faq_articles?.solution && (
              <div>
                <Label className="text-sm font-semibold">Solução</Label>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {ticket.faq_articles?.solution}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* SLA Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status do SLA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">1ª Resposta</span>
              <Badge className={slaStatus.color} variant="outline">
                {slaStatus.label}
              </Badge>
            </div>
            {slaStatus.percentage !== undefined && (
              <>
                <Progress value={slaStatus.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{slaStatus.timeRemaining}</p>
              </>
            )}
          </div>
          
          {resolutionSLA && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Resolução</span>
                <Badge 
                  className={resolutionSLA.isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                  variant="outline"
                >
                  {resolutionSLA.isOverdue ? 'Vencido' : 'No Prazo'}
                </Badge>
              </div>
              <Progress value={resolutionSLA.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {resolutionSLA.isOverdue 
                  ? `Venceu há ${formatDuration(Math.abs(resolutionSLA.remaining))}`
                  : `${formatDuration(resolutionSLA.remaining)} restantes`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Technical Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informações Técnicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Segmento" value={ticket.segment} />
          <InfoRow label="Ambiente" value={ticket.db_environment || ticket.app_environment} />
          {ticket.segment === 'DB' && (
            <>
              <InfoRow label="Engine" value={ticket.db_engine} />
              <InfoRow label="Instância" value={ticket.database_instances?.instance_name} />
            </>
          )}
          {ticket.segment === 'APP' && (
            <>
              <InfoRow label="Produto" value={ticket.application_products?.name} />
              <InfoRow label="Versão" value={ticket.app_version} />
              <InfoRow label="Módulo" value={ticket.app_module} />
            </>
          )}
          <InfoRow label="Máquina" value={ticket.db_machine?.hostname || ticket.app_machine?.hostname} />
        </CardContent>
      </Card>
      
      {/* People */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pessoas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Analista</Label>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {ticket.profiles?.full_name?.[0] || 'N'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{ticket.profiles?.full_name || 'Não atribuído'}</span>
            </div>
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Time</Label>
            <p className="text-sm mt-1">{ticket.teams?.name || 'Não atribuído'}</p>
          </div>
          
          <Separator />
          
          <div>
            <Label className="text-xs text-muted-foreground">Contato</Label>
            <p className="text-sm mt-1">{ticket.contact_name}</p>
            <p className="text-xs text-muted-foreground">{ticket.contact_email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
