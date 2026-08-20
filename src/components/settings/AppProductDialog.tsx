import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
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

const productSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(50),
  description: z.string().max(500).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface AppProduct {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

interface AppProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: AppProduct | null;
}

export default function AppProductDialog({
  open,
  onOpenChange,
  product,
}: AppProductDialogProps) {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const isEditing = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [product, form]);

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { error } = await supabase
        .from("application_products")
        .insert({
          tenant_id: tenantId,
          name: data.name,
          description: data.description || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["application_products"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar produto: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { error } = await supabase
        .from("application_products")
        .update({
          name: data.name,
          description: data.description || null,
        })
        .eq("id", product!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["application_products"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });

  const onSubmit = (data: ProductFormData) => {
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
            {isEditing ? "Editar Produto" : "Novo Produto de Aplicação"}
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
                    <Input placeholder="Ex: ContaDia" {...field} />
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
                      placeholder="Descrição do produto..."
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
