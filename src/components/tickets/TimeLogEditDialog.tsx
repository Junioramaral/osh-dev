import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTimeLogMutations } from "@/hooks/useTimeLogMutations";
import { Clock, Pencil } from "lucide-react";
import { formatSmartDate } from "@/lib/dateUtils";

interface TimeLogEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: {
    id: string;
    hours: number;
    description?: string;
    logged_at: string;
    ticketId: string;
  } | null;
}

export function TimeLogEditDialog({ open, onOpenChange, log }: TimeLogEditDialogProps) {
  const [hours, setHours] = useState<number>(0);
  const [description, setDescription] = useState("");
  const { updateTimeLog } = useTimeLogMutations();

  useEffect(() => {
    if (log) {
      setHours(log.hours);
      setDescription(log.description || "");
    }
  }, [log]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!log || hours < 0.5 || hours > 24) return;

    await updateTimeLog.mutateAsync({
      logId: log.id,
      ticketId: log.ticketId,
      hours,
      description: description.trim() || undefined,
    });

    onOpenChange(false);
  };

  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Editar Registro de Horas
          </DialogTitle>
          <DialogDescription>
            Registrado em {formatSmartDate(log.logged_at)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-hours">Horas Trabalhadas *</Label>
            <Input
              id="edit-hours"
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Mínimo: 0.5h | Máximo: 24h
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição do Trabalho</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o trabalho realizado..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={hours < 0.5 || hours > 24 || updateTimeLog.isPending}
            >
              {updateTimeLog.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
