import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";

export interface RequiredFieldsValues {
  analystId?: string;
  teamId?: string;
  queueId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketCount: number;
  missing: { analyst: boolean; team: boolean; queue: boolean };
  onConfirm: (values: RequiredFieldsValues) => void;
  isLoading?: boolean;
}

const OTIMIZZO_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export function RequiredFieldsBeforeResolveDialog({
  open,
  onOpenChange,
  ticketCount,
  missing,
  onConfirm,
  isLoading,
}: Props) {
  const [analystId, setAnalystId] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [queueId, setQueueId] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setAnalystId("");
      setTeamId("");
      setQueueId("");
    }
  }, [open]);

  const { data: analysts, isLoading: loadingAnalysts } = useQuery({
    queryKey: ["otimizzo-analysts-required"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("client_id", OTIMIZZO_TENANT_ID)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: open && missing.analyst,
  });

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ["teams-required"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, segment")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open && missing.team,
  });

  const { data: queues, isLoading: loadingQueues } = useQuery({
    queryKey: ["queues-required"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queues")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: open && missing.queue,
  });

  const isValid =
    (!missing.analyst || !!analystId) &&
    (!missing.team || !!teamId) &&
    (!missing.queue || !!queueId);

  const handleConfirm = () => {
    if (!isValid) return;
    const values: RequiredFieldsValues = {};
    if (missing.analyst) values.analystId = analystId;
    if (missing.team) values.teamId = teamId;
    if (missing.queue) values.queueId = queueId;
    onConfirm(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Informações obrigatórias para resolver
          </DialogTitle>
          <DialogDescription>
            Antes de resolver {ticketCount > 1 ? `${ticketCount} tickets` : "o ticket"},
            é necessário atribuir Analista, Time e Fila. Preencha os campos faltantes abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {missing.analyst && (
            <div className="space-y-2">
              <Label>
                Analista <span className="text-destructive">*</span>
              </Label>
              <Select value={analystId} onValueChange={setAnalystId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingAnalysts ? "Carregando..." : "Selecione um analista"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {analysts?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {missing.team && (
            <div className="space-y-2">
              <Label>
                Time <span className="text-destructive">*</span>
              </Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingTeams ? "Carregando..." : "Selecione um time"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.segment ? `· ${t.segment}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {missing.queue && (
            <div className="space-y-2">
              <Label>
                Fila <span className="text-destructive">*</span>
              </Label>
              <Select value={queueId} onValueChange={setQueueId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingQueues ? "Carregando..." : "Selecione uma fila"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {queues?.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {ticketCount > 1 && (
            <p className="text-xs text-muted-foreground">
              Os valores selecionados serão aplicados apenas aos tickets que estão com o
              respectivo campo vazio. Tickets já preenchidos não serão sobrescritos.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Continuar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}