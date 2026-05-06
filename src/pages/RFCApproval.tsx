import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Calendar,
  Building2,
  Tag,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import RFCContextCards from "@/components/tickets/RFCContextCards";
import { attachTicketCreators } from "@/lib/ticketCreator";

type RFC = {
  id: string;
  ticket_number: string;
  title: string;
  segment: string;
  status: string;
  created_at: string;
  clients: { name: string; domain?: string | null } | null;
  [key: string]: any;
};

type RFCStep = {
  id: string;
  descricao: string;
  procedimento: string | null;
  scripts: string | null;
  ordem: number;
  status_concluido: boolean;
};

const segmentBadge = (segment: string) =>
  segment === "DB" ? (
    <Badge variant="secondary" className="font-mono text-xs">DB</Badge>
  ) : (
    <Badge variant="outline" className="font-mono text-xs">APP</Badge>
  );

const RFCApproval = () => {
  const { user, profile } = useAuth();
  const [selectedRfcId, setSelectedRfcId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [isActing, setIsActing] = useState(false);
  const queryClient = useQueryClient();

  const { data: rfcs = [], isLoading: rfcsLoading } = useQuery({
    queryKey: ["rfc-pending-approval-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id, ticket_number, title, segment, status, created_at,
          contact_name, contact_email,
          db_engine, db_environment, app_environment, app_module, app_version,
          clients(name, domain),
          database_instances(instance_name, version),
          application_instances(version, environment),
          application_products(name),
          db_machine:machines!tickets_db_machine_id_fkey(hostname),
          app_machine:machines!tickets_app_machine_id_fkey(hostname)
        `)
        .eq("record_type", "rfc")
        .eq("status", "aguardando_aprovacao")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const withCreators = await attachTicketCreators((data ?? []) as any[]);
      return withCreators as RFC[];
    },
  });

  const { data: steps = [], isLoading: stepsLoading } = useQuery({
    queryKey: ["rfc-steps-approval", selectedRfcId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfc_steps")
        .select("*")
        .eq("ticket_id", selectedRfcId!)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as RFCStep[];
    },
    enabled: !!selectedRfcId,
  });

  const selectedRfc = rfcs.find((r) => r.id === selectedRfcId) ?? null;

  const handleSelectRfc = (id: string) => {
    setSelectedRfcId(id);
    setShowDetails(true);
    setExpandedStepId(null);
    setComentario("");
  };

  const handleBack = () => {
    setShowDetails(false);
  };

  const handleApprove = async () => {
    if (!selectedRfcId || !comentario.trim() || !user) return;
    setIsActing(true);

    const { error: ticketError } = await supabase
      .from("tickets")
      .update({ status: "aprovado" })
      .eq("id", selectedRfcId);

    if (ticketError) {
      toast({ title: "Erro ao aprovar RFC", description: ticketError.message, variant: "destructive" });
      setIsActing(false);
      return;
    }

    await supabase.from("ticket_comments").insert({
      ticket_id: selectedRfcId,
      author_id: user.id,
      content: `✅ RFC APROVADA por ${profile?.full_name ?? "Gestor"}.\n\nComentário: ${comentario.trim()}`,
      is_internal: true,
    });

    // Fire-and-forget: send email notification
    const { data: ticketData } = await supabase
      .from("tickets")
      .select("contact_email, contact_name, ticket_number, title")
      .eq("id", selectedRfcId)
      .single();

    if (ticketData?.contact_email) {
      supabase.functions.invoke("send-rfc-decision-notification", {
        body: {
          ticketId: selectedRfcId,
          ticketNumber: ticketData.ticket_number,
          ticketTitle: ticketData.title,
          contactEmail: ticketData.contact_email,
          contactName: ticketData.contact_name,
          decision: "aprovada",
          comentario: comentario.trim(),
          gestorName: profile?.full_name ?? "Gestor",
        },
      }).catch((err) => console.error("Erro ao enviar notificação RFC:", err));
    }

    toast({ title: "RFC Aprovada!", description: "A RFC foi aprovada e agora aparece na fila de execução." });
    queryClient.invalidateQueries({ queryKey: ["rfc-pending-approval-list"] });
    setSelectedRfcId(null);
    setShowDetails(false);
    setComentario("");
    setIsActing(false);
  };

  const handleReject = async () => {
    if (!selectedRfcId || !comentario.trim() || !user) return;
    setIsActing(true);

    const { error: ticketError } = await supabase
      .from("tickets")
      .update({ status: "novo" })
      .eq("id", selectedRfcId);

    if (ticketError) {
      toast({ title: "Erro ao rejeitar RFC", description: ticketError.message, variant: "destructive" });
      setIsActing(false);
      return;
    }

    await supabase.from("ticket_comments").insert({
      ticket_id: selectedRfcId,
      author_id: user.id,
      content: `❌ RFC REJEITADA por ${profile?.full_name ?? "Gestor"}.\n\nMotivo: ${comentario.trim()}`,
      is_internal: true,
    });

    // Fire-and-forget: send email notification
    const { data: ticketDataReject } = await supabase
      .from("tickets")
      .select("contact_email, contact_name, ticket_number, title")
      .eq("id", selectedRfcId)
      .single();

    if (ticketDataReject?.contact_email) {
      supabase.functions.invoke("send-rfc-decision-notification", {
        body: {
          ticketId: selectedRfcId,
          ticketNumber: ticketDataReject.ticket_number,
          ticketTitle: ticketDataReject.title,
          contactEmail: ticketDataReject.contact_email,
          contactName: ticketDataReject.contact_name,
          decision: "rejeitada",
          comentario: comentario.trim(),
          gestorName: profile?.full_name ?? "Gestor",
        },
      }).catch((err) => console.error("Erro ao enviar notificação RFC:", err));
    }

    toast({ title: "RFC Rejeitada", description: "A RFC foi rejeitada e retornou para rascunho.", variant: "destructive" });
    queryClient.invalidateQueries({ queryKey: ["rfc-pending-approval-list"] });
    setSelectedRfcId(null);
    setShowDetails(false);
    setComentario("");
    setIsActing(false);
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Aprovação de RFC</h1>
            <p className="text-sm text-muted-foreground">
              Revise os passos e aprove ou rejeite RFCs enviadas para análise
            </p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[300px_1fr] h-[calc(100vh-220px)] min-h-[500px]">
          {/* Left: RFC List — inline JSX (not a sub-component) */}
          <div className="border-r border-border">
            <div className={`flex flex-col h-full ${showDetails ? "hidden md:flex" : "flex"}`}>
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Aguardando Aprovação</h2>
                  {rfcs.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">{rfcs.length}</Badge>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1">
                {rfcsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : rfcs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <ClipboardList className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Nenhuma RFC pendente</p>
                    <p className="text-xs text-muted-foreground mt-1">RFCs enviadas para aprovação aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {rfcs.map((rfc) => (
                      <button
                        key={rfc.id}
                        onClick={() => handleSelectRfc(rfc.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${
                          selectedRfcId === rfc.id
                            ? "bg-accent border-primary/30"
                            : "bg-card border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">#{rfc.ticket_number}</span>
                          {segmentBadge(rfc.segment)}
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-2 mb-1">{rfc.title}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">{rfc.clients?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(rfc.created_at), "dd/MM/yy", { locale: ptBR })}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Right: Details + Decision — inline JSX (not a sub-component) */}
          <div className={`flex flex-col h-full min-h-0 ${!showDetails && !selectedRfcId ? "hidden md:flex" : showDetails ? "flex" : "hidden md:flex"}`}>
            {!selectedRfc ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-base font-medium text-muted-foreground">Selecione uma RFC</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em uma RFC da lista para revisar os passos e tomar uma decisão.
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-0">
                {/* Mobile back button */}
                <div className="md:hidden p-3 border-b border-border">
                  <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar à lista
                  </Button>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 space-y-4">
                    {/* Header */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">#{selectedRfc.ticket_number}</span>
                        {segmentBadge(selectedRfc.segment)}
                        <Badge variant="outline" className="text-xs border-yellow-500/40 text-yellow-600 dark:text-yellow-400">
                          Aguardando Aprovação
                        </Badge>
                      </div>
                      <h3 className="text-base font-semibold text-foreground leading-snug">{selectedRfc.title}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {selectedRfc.clients?.name ?? "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(selectedRfc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    {/* Context cards: Cliente / Contato / Informações Técnicas */}
                    <RFCContextCards ticket={selectedRfc} />

                    <Separator />

                    {/* Steps */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Passos da RFC
                        {steps.length > 0 && (
                          <span className="text-xs text-muted-foreground font-normal">({steps.length} passo{steps.length !== 1 ? "s" : ""})</span>
                        )}
                      </p>
                      {stepsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : steps.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Nenhum passo cadastrado para esta RFC.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {steps.map((step) => {
                            const isStepExpanded = expandedStepId === step.id;
                            const hasDetails = !!(step.procedimento || step.scripts);
                            return (
                              <div
                                key={step.id}
                                className="rounded-lg border border-border bg-card"
                              >
                                <div
                                  className={`flex items-start gap-3 p-3 ${hasDetails ? "cursor-pointer hover:bg-muted/30 transition-colors" : ""}`}
                                  onClick={() => hasDetails && setExpandedStepId(isStepExpanded ? null : step.id)}
                                >
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                                    {step.ordem + 1}
                                  </div>
                                  <span className="text-sm text-foreground leading-snug flex-1">
                                    {step.descricao}
                                  </span>
                                  {hasDetails && (
                                    <span className="shrink-0 text-muted-foreground">
                                      {isStepExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </span>
                                  )}
                                </div>
                                {isStepExpanded && hasDetails && (
                                  <div className="border-t border-border px-3 pb-3 pt-3 space-y-3 bg-muted/20">
                                    {step.procedimento && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                          Procedimento Detalhado
                                        </p>
                                        <p className="text-sm text-foreground whitespace-pre-wrap">{step.procedimento}</p>
                                      </div>
                                    )}
                                    {step.scripts && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                          Scripts / Comandos
                                        </p>
                                        <pre className="text-sm font-mono p-3 rounded-md bg-zinc-900 text-green-400 overflow-x-auto whitespace-pre-wrap">
                                          {step.scripts}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Decision section */}
                    <div className="space-y-3 pb-2">
                      <p className="text-sm font-semibold text-foreground">Decisão do Gestor</p>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Comentário <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                          placeholder="Ex: RFC aprovada. Agendar janela de manutenção para..."
                          value={comentario}
                          onChange={(e) => setComentario(e.target.value)}
                          rows={4}
                          className="resize-none text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          O comentário é obrigatório para aprovar ou rejeitar.
                        </p>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!comentario.trim() || isActing}
                          onClick={handleReject}
                          className="gap-2"
                        >
                          {isActing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Rejeitar RFC
                        </Button>
                        <Button
                          size="sm"
                          disabled={!comentario.trim() || isActing}
                          onClick={handleApprove}
                          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isActing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Aprovar RFC
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </Card>
    </AppLayout>
  );
};

export default RFCApproval;
