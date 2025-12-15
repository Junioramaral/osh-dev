import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ListOrdered, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BulkAssignQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (queueId: string | null) => void;
  selectedCount: number;
  currentQueueId?: string | null;
}

export function BulkAssignQueueDialog({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  currentQueueId,
}: BulkAssignQueueDialogProps) {
  const [selectedQueue, setSelectedQueue] = useState<string>("none");

  const { data: queues, isLoading } = useQuery({
    queryKey: ["queues-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queues")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (open) {
      setSelectedQueue(currentQueueId || "none");
    }
  }, [open, currentQueueId]);

  const handleConfirm = () => {
    onConfirm(selectedQueue === "none" ? null : selectedQueue);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5" />
            Atribuir Fila
          </DialogTitle>
          <DialogDescription>
            Selecione a fila para {selectedCount} ticket(s) selecionado(s)
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando filas...</p>
          ) : (
            <RadioGroup value={selectedQueue} onValueChange={setSelectedQueue}>
              <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                <RadioGroupItem value="none" id="queue-none" />
                <Label
                  htmlFor="queue-none"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground italic">Remover da fila</span>
                </Label>
              </div>
              {queues?.map((queue) => (
                <div
                  key={queue.id}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted"
                >
                  <RadioGroupItem value={queue.id} id={`queue-${queue.id}`} />
                  <Label
                    htmlFor={`queue-${queue.id}`}
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <ListOrdered className="h-4 w-4 text-primary" />
                    {queue.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            Atribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
