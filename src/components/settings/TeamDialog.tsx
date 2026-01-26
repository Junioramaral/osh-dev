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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const teamSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  segment: z.enum(["DB", "APP"], { required_error: "Segmento é obrigatório" }),
  specialization: z.string().max(200, "Especialização muito longa").optional(),
});

type TeamFormData = z.infer<typeof teamSchema>;

export interface Team {
  id: string;
  name: string;
  segment: "DB" | "APP";
  specialization: string | null;
}

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
}

export default function TeamDialog({ open, onOpenChange, team }: TeamDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!team;

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      segment: undefined,
      specialization: "",
    },
  });

  useEffect(() => {
    if (team) {
      form.reset({
        name: team.name,
        segment: team.segment,
        specialization: team.specialization || "",
      });
    } else {
      form.reset({
        name: "",
        segment: undefined,
        specialization: "",
      });
    }
  }, [team, form]);

  const createMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      const { error } = await supabase.from("teams").insert({
        name: data.name,
        segment: data.segment,
        specialization: data.specialization || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams-with-queues"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Time criado com sucesso");
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error("Erro ao criar time: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      if (!team) return;
      const { error } = await supabase
        .from("teams")
        .update({
          name: data.name,
          segment: data.segment,
          specialization: data.specialization || null,
        })
        .eq("id", team.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams-with-queues"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Time atualizado com sucesso");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar time: " + error.message);
    },
  });

  const onSubmit = (data: TeamFormData) => {
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
            {isEditing ? "Editar Time" : "Novo Time"}
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
                    <Input placeholder="Nome do time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="segment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Segmento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o segmento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DB">DB - Banco de Dados</SelectItem>
                      <SelectItem value="APP">APP - Aplicação</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialização (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Oracle, PostgreSQL, Frontend..." 
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
