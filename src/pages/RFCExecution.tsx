import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ClipboardCheck, ArrowLeft, CheckCircle2, Loader2, Calendar, Building2, Tag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

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
  ticket_id: string;
};

const RFCExecution = () => {
  const [selectedRfcId, setSelectedRfcId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();

  const { data: rfcs = [], isLoading: rfcsLoading } = useQuery({
    queryKey: ["rfc-approved-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, segment, status, created_at, clients(name)")
        .eq("record_type", "rfc")
        .eq("status", "aprovado")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RFC[];
    },
  });

  const { data: steps = [], isLoading: stepsLoading } = useQuery({
    queryKey: ["rfc-steps", selectedRfcId],
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
  const allDone = totalCount > 0 && completedCount === totalCount;

  const handleSelectRfc = (id: string) => {
    setSelectedRfcId(id);
    setShowDetails(true);
  };

  const handleBack = () => {
    setShowDetails(false);
  };

  const toggleStep = async (stepId: string, currentValue: boolean) => {
    // Optimistic update
    queryClient.setQueryData(["rfc-steps", selectedRfcId], (old: RFCStep[] | undefined) =>
      (old ?? []).map((s) =>
        s.id === stepId ? { ...s, status_concluido: !currentValue } : s
      )
    );

    const { error } = await supabase
      .from("rfc_steps")
      .update({ status_concluido: !currentValue, updated_at: new Date().toISOString() })
      .eq("id", stepId);

    if (error) {
      toast({ title: "Erro ao atualizar passo", description: error.message, variant: "destructive" });
      // Revert
      queryClient.setQueryData(["rfc-steps", selectedRfcId], (old: RFCStep[] | undefined) =>
        (old ?? []).map((s) =>
          s.id === stepId ? { ...s, status_concluido: currentValue } : s
        )
      );
    }

    queryClient.invalidateQueries({ queryKey: ["rfc-steps", selectedRfcId] });
  };

  const handleMarkConcluida = async () => {
    if (!selectedRfcId) return;
    const { error } = await supabase
      .from("tickets")
      .update({ status: "resolvido", resolved_at: new Date().toISOString() })
      .eq("id", selectedRfcId);

    if (error) {
      toast({ title: "Erro ao concluir RFC", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "RFC marcada como concluída!", description: "O status foi atualizado para Resolvido." });
    queryClient.invalidateQueries({ queryKey: ["rfc-approved-list"] });
    setSelectedRfcId(null);
    setShowDetails(false);
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
          <ClipboardCheck className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">RFCs Aprovadas</h2>
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
            <ClipboardCheck className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhuma RFC aprovada</p>
            <p className="text-xs text-muted-foreground mt-1">RFCs com status "Aprovado" aparecerão aqui.</p>
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
                <p className="text-xs text-muted-foreground">{rfc.clients?.name ?? "—"}</p>
              </button>
            ))}
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
          <ClipboardCheck className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-base font-medium text-muted-foreground">Selecione uma RFC</p>
          <p className="text-sm text-muted-foreground mt-1">Clique em uma RFC da lista para ver os detalhes e executar o checklist.</p>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Mobile back button */}
          <div className="md:hidden p-3 border-b border-border">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar à lista
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">#{selectedRfc.ticket_number}</span>
                  {segmentBadge(selectedRfc.segment)}
                  <Badge variant="outline" className="text-xs border-primary/40 text-primary">Aprovado</Badge>
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

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Progresso</span>
                  <span className="text-muted-foreground">
                    {completedCount}/{totalCount} passos concluídos ({progressPercent}%)
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Success banner */}
              {allDone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Todos os passos concluídos!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Marque a RFC como concluída para finalizar.</p>
                  </div>
                  <Button size="sm" onClick={handleMarkConcluida} className="shrink-0">
                    Concluir RFC
                  </Button>
                </div>
              )}

              <Separator />

              {/* Checklist */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Passos de Execução
                </p>
                {stepsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum passo cadastrado para esta RFC.</p>
                ) : (
                  <div className="space-y-2">
                    {steps.map((step) => (
                      <label
                        key={step.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          step.status_concluido
                            ? "bg-muted/50 border-border"
                            : "bg-card border-border hover:bg-accent/50"
                        }`}
                      >
                        <Checkbox
                          checked={step.status_concluido}
                          onCheckedChange={() => toggleStep(step.id, step.status_concluido)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                            {String(step.ordem + 1).padStart(2, "0")}.
                          </span>
                          <span
                            className={`text-sm leading-snug ${
                              step.status_concluido ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {step.descricao}
                          </span>
                        </div>
                      </label>
                    ))}
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
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Execução de RFC</h1>
            <p className="text-sm text-muted-foreground">Gerencie e execute os passos das RFCs aprovadas</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[300px_1fr] h-[calc(100vh-220px)] min-h-[500px]">
          {/* Left: RFC List */}
          <div className="border-r border-border">
            <ListPanel />
          </div>
          {/* Right: Details + Checklist */}
          <DetailPanel />
        </div>
      </Card>
    </AppLayout>
  );
};

export default RFCExecution;
