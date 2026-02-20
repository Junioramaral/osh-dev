import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type RFC = {
  id: string;
  ticket_number: string;
  title: string;
  segment: string;
  status: string;
  created_at: string;
  clients: { name: string } | null;
};

type RFCStep = {
  id: string;
  descricao: string;
  ordem: number;
  status_concluido: boolean;
  concluded_at: string | null;
  ticket_id: string;
};

type StatusConfig = {
  label: string;
  colorClass: string;
  dotClass: string;
};

const getStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case "aguardando_aprovacao":
      return {
        label: "Aguardando Aprovação",
        colorClass: "bg-amber-50 border-amber-200 text-amber-800",
        dotClass: "bg-amber-500",
      };
    case "aprovado":
      return {
        label: "Manutenção Aprovada — Em Breve",
        colorClass: "bg-blue-50 border-blue-200 text-blue-800",
        dotClass: "bg-blue-500",
      };
    case "em_atendimento":
    case "novo":
      return {
        label: "Sua manutenção está em andamento",
        colorClass: "bg-green-50 border-green-200 text-green-800",
        dotClass: "bg-green-500",
      };
    case "resolvido":
      return {
        label: "Manutenção Concluída",
        colorClass: "bg-emerald-50 border-emerald-200 text-emerald-900",
        dotClass: "bg-emerald-600",
      };
    case "fechado":
      return {
        label: "RFC Encerrada",
        colorClass: "bg-muted border-border text-muted-foreground",
        dotClass: "bg-muted-foreground",
      };
    default:
      return {
        label: status,
        colorClass: "bg-muted border-border text-muted-foreground",
        dotClass: "bg-muted-foreground",
      };
  }
};

const ClientRFCPortal = () => {
  const [selectedRfcId, setSelectedRfcId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { data: rfcs = [], isLoading: rfcsLoading } = useQuery({
    queryKey: ["client-rfc-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, segment, status, created_at, clients(name)")
        .eq("record_type", "rfc")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RFC[];
    },
  });

  const { data: steps = [], isLoading: stepsLoading } = useQuery({
    queryKey: ["client-rfc-steps", selectedRfcId],
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
  const completedCount = steps.filter((s) => s.status_concluido).length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleSelectRfc = (id: string) => {
    setSelectedRfcId(id);
    setShowDetails(true);
  };

  const segmentBadge = (segment: string) =>
    segment === "DB" ? (
      <Badge variant="secondary" className="font-mono text-xs">DB</Badge>
    ) : (
      <Badge variant="outline" className="font-mono text-xs">APP</Badge>
    );

  // --- List Panel ---
  const ListPanel = () => (
    <div className={`flex flex-col h-full ${showDetails ? "hidden md:flex" : "flex"}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Minhas RFCs</h2>
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
            <p className="text-sm font-medium text-muted-foreground">Nenhuma RFC encontrada</p>
            <p className="text-xs text-muted-foreground mt-1">Suas solicitações de manutenção aparecerão aqui.</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {rfcs.map((rfc) => {
              const statusConfig = getStatusConfig(rfc.status);
              return (
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
                  <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">{rfc.title}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${statusConfig.dotClass}`} />
                    <span className="text-xs text-muted-foreground">{statusConfig.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // --- Detail Panel ---
  const DetailPanel = () => (
    <div className={`flex flex-col h-full ${!showDetails && !selectedRfcId ? "hidden md:flex" : showDetails ? "flex" : "hidden md:flex"}`}>
      {!selectedRfc ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-base font-medium text-muted-foreground">Selecione uma RFC</p>
          <p className="text-sm text-muted-foreground mt-1">Clique em uma RFC da lista para acompanhar o progresso.</p>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Mobile back button */}
          <div className="md:hidden p-3 border-b border-border">
            <Button variant="ghost" size="sm" onClick={() => setShowDetails(false)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar à lista
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Big status badge */}
              {(() => {
                const cfg = getStatusConfig(selectedRfc.status);
                return (
                  <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${cfg.colorClass}`}>
                    <span className={`w-3 h-3 rounded-full shrink-0 ${cfg.dotClass}`} />
                    <div>
                      <p className="font-semibold text-base leading-tight">{cfg.label}</p>
                      <p className="text-xs mt-0.5 opacity-70">
                        RFC #{selectedRfc.ticket_number} · {selectedRfc.segment === "DB" ? "Banco de Dados" : "Aplicativo"}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Header info */}
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground leading-snug">{selectedRfc.title}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Aberta em {format(new Date(selectedRfc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>

              <Separator />

              {/* Progress bar */}
              {totalCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Progresso da execução</span>
                    <span className="text-muted-foreground text-xs">
                      {completedCount}/{totalCount} passos ({progressPercent}%)
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2.5" />
                </div>
              )}

              <Separator />

              {/* Vertical Timeline */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground mb-3">Passos de Execução</p>

                {stepsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum passo cadastrado para esta RFC.
                  </p>
                ) : (
                  <div className="relative">
                    {steps.map((step, index) => {
                      const isLast = index === steps.length - 1;
                      const isDone = step.status_concluido;

                      return (
                        <div key={step.id} className="relative flex gap-4">
                          {/* Timeline line */}
                          {!isLast && (
                            <div
                              className={`absolute left-[15px] top-8 w-0.5 h-full -mb-1 ${
                                isDone ? "bg-green-400" : "bg-border"
                              }`}
                            />
                          )}

                          {/* Icon */}
                          <div className="shrink-0 mt-0.5">
                            {isDone ? (
                              <CheckCircle2 className="w-8 h-8 text-green-500" />
                            ) : (
                              <div className="w-8 h-8 rounded-full border-2 border-border bg-background flex items-center justify-center">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className={`flex-1 pb-6 ${isLast ? "pb-2" : ""}`}>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                                {String(step.ordem + 1).padStart(2, "0")}.
                              </span>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium leading-snug ${
                                    isDone ? "text-muted-foreground line-through" : "text-foreground"
                                  }`}
                                >
                                  {step.descricao}
                                </p>
                                {isDone && step.concluded_at ? (
                                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Concluído em{" "}
                                    {format(new Date(step.concluded_at), "dd/MM/yyyy 'às' HH:mm", {
                                      locale: ptBR,
                                    })}
                                  </p>
                                ) : isDone ? (
                                  <p className="text-xs text-green-600 mt-1">✓ Concluído</p>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-1">Aguardando execução</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Minhas RFCs</h1>
            <p className="text-sm text-muted-foreground">Acompanhe o progresso das suas manutenções</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[300px_1fr] h-[calc(100vh-220px)] min-h-[500px]">
          <div className="border-r border-border">
            <ListPanel />
          </div>
          <DetailPanel />
        </div>
      </Card>
    </AppLayout>
  );
};

export default ClientRFCPortal;
