import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSegments } from "@/hooks/useSegments";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export interface TicketCategory {
  id: string;
  name: string;
  segment: "DB" | "APP" | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  segment: z.string(),
  is_active: z.boolean(),
  sort_order: z.number(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: TicketCategory | null;
}

export default function CategoryDialog({
  open,
  onOpenChange,
  category,
}: CategoryDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!category;
  const { data: segments, isLoading: segmentsLoading } = useActiveSegments();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      segment: "both",
      is_active: true,
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        segment: category.segment || "both",
        is_active: category.is_active,
        sort_order: category.sort_order,
      });
    } else {
      form.reset({
        name: "",
        segment: "both",
        is_active: true,
        sort_order: 0,
      });
    }
  }, [category, form]);

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const segmentValue = data.segment === "both" ? null : data.segment as "DB" | "APP";
      const { error } = await supabase.from("ticket_categories").insert({
        name: data.name,
        segment: segmentValue,
        is_active: data.is_active,
        sort_order: data.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket_categories"] });
      toast.success("Categoria criada com sucesso");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao criar categoria: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (!category) return;
      const segmentValue = data.segment === "both" ? null : data.segment as "DB" | "APP";
      const { error } = await supabase
        .from("ticket_categories")
        .update({
          name: data.name,
          segment: segmentValue,
          is_active: data.is_active,
          sort_order: data.sort_order,
        })
        .eq("id", category.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket_categories"] });
      toast.success("Categoria atualizada com sucesso");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar categoria: " + error.message);
    },
  });

  const onSubmit = (data: CategoryFormData) => {
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
            {isEditing ? "Editar Categoria" : "Nova Categoria"}
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
                    <Input placeholder="Ex: Erro de Performance" {...field} />
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
                      <SelectItem value="both">Ambos (todos os segmentos)</SelectItem>
                      {segmentsLoading ? (
                        <SelectItem value="" disabled>Carregando...</SelectItem>
                      ) : segments?.map((segment) => (
                        <SelectItem key={segment.id} value={segment.code}>
                          {segment.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordem</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Ativo</Label>
                    <p className="text-sm text-muted-foreground">
                      Categoria disponível para seleção
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
