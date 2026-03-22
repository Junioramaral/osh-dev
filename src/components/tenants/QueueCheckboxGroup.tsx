import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface QueueCheckboxGroupProps {
  selectedQueueIds: string[];
  onQueuesChange: (queueIds: string[]) => void;
  disabled?: boolean;
}

export function QueueCheckboxGroup({ selectedQueueIds, onQueuesChange, disabled }: QueueCheckboxGroupProps) {
  const { data: queues, isLoading } = useQuery({
    queryKey: ["queues-all-active"],
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

  const handleToggle = (queueId: string, checked: boolean) => {
    if (checked) {
      onQueuesChange([...selectedQueueIds, queueId]);
    } else {
      onQueuesChange(selectedQueueIds.filter(id => id !== queueId));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Label>Filas</Label>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Filas de Atendimento</Label>
      <div className="grid grid-cols-1 gap-2 border rounded-md p-3">
        {queues?.map((queue) => (
          <div key={queue.id} className="flex items-center gap-3">
            <Checkbox
              id={`queue-${queue.id}`}
              checked={selectedQueueIds.includes(queue.id)}
              onCheckedChange={(checked) => handleToggle(queue.id, !!checked)}
              disabled={disabled}
            />
            <Label
              htmlFor={`queue-${queue.id}`}
              className="text-sm font-medium cursor-pointer"
            >
              {queue.name}
            </Label>
          </div>
        ))}
        {(!queues || queues.length === 0) && (
          <p className="text-xs text-muted-foreground">Nenhuma fila disponível</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Define quais filas o analista pode visualizar e atender
      </p>
    </div>
  );
}
