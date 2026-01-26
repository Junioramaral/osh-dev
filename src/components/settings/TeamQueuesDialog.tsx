import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Team {
  id: string;
  name: string;
  segment: string;
}

interface Queue {
  id: string;
  name: string;
  is_active: boolean;
}

interface TeamQueuesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
}

export default function TeamQueuesDialog({ open, onOpenChange, team }: TeamQueuesDialogProps) {
  const queryClient = useQueryClient();
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);

  // Fetch all active queues
  const { data: queues, isLoading: queuesLoading } = useQuery({
    queryKey: ["queues-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queues")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Queue[];
    },
    enabled: open,
  });

  // Fetch current team queues
  const { data: teamQueues, isLoading: teamQueuesLoading } = useQuery({
    queryKey: ["team-queues", team?.id],
    queryFn: async () => {
      if (!team) return [];
      const { data, error } = await supabase
        .from("teams_queues")
        .select("queue_id")
        .eq("team_id", team.id);
      if (error) throw error;
      return data.map((tq) => tq.queue_id);
    },
    enabled: open && !!team,
  });

  // Initialize selected queues when data loads
  useEffect(() => {
    if (teamQueues) {
      setSelectedQueues(teamQueues);
    }
  }, [teamQueues]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!team) return;

      // Delete all existing associations
      const { error: deleteError } = await supabase
        .from("teams_queues")
        .delete()
        .eq("team_id", team.id);
      
      if (deleteError) throw deleteError;

      // Insert new associations
      if (selectedQueues.length > 0) {
        const { error: insertError } = await supabase
          .from("teams_queues")
          .insert(
            selectedQueues.map((queueId) => ({
              team_id: team.id,
              queue_id: queueId,
            }))
          );
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast.success("Filas do time atualizadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["team-queues"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar filas", {
        description: error.message,
      });
    },
  });

  const toggleQueue = (queueId: string) => {
    setSelectedQueues((prev) =>
      prev.includes(queueId)
        ? prev.filter((id) => id !== queueId)
        : [...prev, queueId]
    );
  };

  const isLoading = queuesLoading || teamQueuesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Filas do Time: {team?.name}
            <Badge variant={team?.segment === "DB" ? "default" : "secondary"}>
              {team?.segment}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Selecione as filas que este time pode atender:
            </p>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {queues?.map((queue) => (
                <div key={queue.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`queue-${queue.id}`}
                    checked={selectedQueues.includes(queue.id)}
                    onCheckedChange={() => toggleQueue(queue.id)}
                  />
                  <Label
                    htmlFor={`queue-${queue.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {queue.name}
                  </Label>
                </div>
              ))}
            </div>
            {queues?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma fila cadastrada. Cadastre filas em Configurações do Sistema.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
