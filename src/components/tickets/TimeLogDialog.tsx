import { useState } from "react";
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
import { Clock } from "lucide-react";
import { useTimeLogMutations } from "@/hooks/useTimeLogMutations";

interface TimeLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    ticket_number: string;
    title: string;
  };
}

export function TimeLogDialog({ open, onOpenChange, ticket }: TimeLogDialogProps) {
  const [hours, setHours] = useState<string>("1");
  const [description, setDescription] = useState("");
  const { addTimeLog } = useTimeLogMutations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hoursValue = parseFloat(hours);
    
    if (isNaN(hoursValue) || hoursValue < 0.5 || hoursValue > 24) {
      return;
    }

    await addTimeLog.mutateAsync({
      ticketId: ticket.id,
      hours: hoursValue,
      description: description.trim() || undefined,
    });

    // Reset form and close dialog
    setHours("1");
    setDescription("");
    onOpenChange(false);
  };

  const hoursValue = parseFloat(hours);
  const isValidHours = !isNaN(hoursValue) && hoursValue >= 0.5 && hoursValue <= 24;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Registrar Horas Trabalhadas
          </DialogTitle>
          <DialogDescription>
            Ticket #{ticket.ticket_number} - {ticket.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hours">
              Horas Trabalhadas <span className="text-destructive">*</span>
            </Label>
            <Input
              id="hours"
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="1.5"
              className="text-lg"
              required
            />
            <p className="text-xs text-muted-foreground">
              Mínimo: 0.5h | Máximo: 24h
            </p>
          </div>

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
              onClick={() => onOpenChange(false)}
              disabled={addTimeLog.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValidHours || addTimeLog.isPending}
            >
              {addTimeLog.isPending ? "Registrando..." : "Registrar Horas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
