import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const queueSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional(),
});

type QueueFormData = z.infer<typeof queueSchema>;

export interface Queue {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface QueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue: Queue | null;
}

export default function QueueDialog({ open, onOpenChange, queue }: QueueDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!queue;

  const form = useForm<QueueFormData>({
    resolver: zodResolver(queueSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (queue) {
      form.reset({
        name: queue.name,
        description: queue.description || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [queue, form]);

  const createMutation = useMutation({
    mutationFn: async (data: QueueFormData) => {
      const { error } = await supabase.from("queues").insert({
        name: data.name,
        description: data.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      toast.success("Fila criada com sucesso");
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error("Erro ao criar fila: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: QueueFormData) => {
      if (!queue) return;
      const { error } = await supabase
        .from("queues")
        .update({
          name: data.name,
          description: data.description || null,
        })
        .eq("id", queue.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      toast.success("Fila atualizada com sucesso");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar fila: " + error.message);
    },
  });

  const onSubmit = (data: QueueFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Fila" : "Nova Fila"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da fila" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição da fila (opcional)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
