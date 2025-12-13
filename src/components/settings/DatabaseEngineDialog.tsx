import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const engineSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(50),
  description: z.string().max(200).optional(),
});

type EngineFormData = z.infer<typeof engineSchema>;

interface DatabaseEngine {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

interface DatabaseEngineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engine: DatabaseEngine | null;
}

export default function DatabaseEngineDialog({
  open,
  onOpenChange,
  engine,
}: DatabaseEngineDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!engine;

  const form = useForm<EngineFormData>({
    resolver: zodResolver(engineSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (engine) {
      form.reset({
        name: engine.name,
        description: engine.description || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [engine, form]);

  const createMutation = useMutation({
    mutationFn: async (data: EngineFormData) => {
      const { error } = await supabase
        .from("database_engines")
        .insert({
          name: data.name,
          description: data.description || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Engine criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["database_engines"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar engine: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EngineFormData) => {
      const { error } = await supabase
        .from("database_engines")
        .update({
          name: data.name,
          description: data.description || null,
        })
        .eq("id", engine!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Engine atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["database_engines"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar engine: " + error.message);
    },
  });

  const onSubmit = (data: EngineFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Engine" : "Novo Engine de Banco"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: PostgreSQL" {...field} />
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
                      placeholder="Descrição opcional do engine..."
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
