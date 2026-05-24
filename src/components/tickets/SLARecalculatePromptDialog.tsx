import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newPriority: string;
  onConfirm: (recalculate: boolean, reason: string) => void;
}

export function SLARecalculatePromptDialog({ open, onOpenChange, newPriority, onConfirm }: Props) {
  const [recalculate, setRecalculate] = useState(false);
  const [reason, setReason] = useState("");

  const canSubmit = !recalculate || reason.trim().length >= 10;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mudar prioridade para {newPriority}</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja recalcular o SLA com base na nova prioridade? Os novos prazos
            serão contados a partir de agora.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox
              id="recalc"
              checked={recalculate}
              onCheckedChange={(c) => setRecalculate(!!c)}
            />
            <Label htmlFor="recalc" className="text-sm font-normal cursor-pointer">
              Recalcular SLA com base na nova prioridade
            </Label>
          </div>

          {recalculate && (
            <div className="space-y-1.5">
              <Label htmlFor="reason">
                Motivo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Ex.: Severidade reavaliada após análise..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de 10 caracteres ({reason.trim().length}/10)
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setReason(""); setRecalculate(false); }}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!canSubmit}
            onClick={() => {
              onConfirm(recalculate, reason.trim());
              setReason("");
              setRecalculate(false);
            }}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}