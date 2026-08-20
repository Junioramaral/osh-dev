import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Database, Package, Server, Cloud, Layers, Monitor, Cpu, Globe } from "lucide-react";
import type { Segment } from "@/hooks/useSegments";

const segmentSchema = z.object({
  code: z.string()
    .min(2, "Código deve ter pelo menos 2 caracteres")
    .max(10, "Código muito longo")
    .regex(/^[A-Z0-9_]+$/, "Use apenas letras maiúsculas, números e underscore"),
  display_name: z.string().min(1, "Nome é obrigatório").max(50, "Nome muito longo"),
  description: z.string().max(200, "Descrição muito longa").optional(),
  icon: z.string().default("Layers"),
  color: z.string().default("gray"),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
});

type SegmentFormData = z.infer<typeof segmentSchema>;

interface SegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: Segment | null;
}

const AVAILABLE_ICONS = [
  { value: "Database", label: "Database", icon: Database },
  { value: "Package", label: "Package", icon: Package },
  { value: "Server", label: "Server", icon: Server },
  { value: "Cloud", label: "Cloud", icon: Cloud },
  { value: "Layers", label: "Layers", icon: Layers },
  { value: "Monitor", label: "Monitor", icon: Monitor },
  { value: "Cpu", label: "CPU", icon: Cpu },
  { value: "Globe", label: "Globe", icon: Globe },
];

const AVAILABLE_COLORS = [
  { value: "blue", label: "Azul" },
  { value: "green", label: "Verde" },
  { value: "orange", label: "Laranja" },
  { value: "red", label: "Vermelho" },
  { value: "purple", label: "Roxo" },
  { value: "gray", label: "Cinza" },
  { value: "yellow", label: "Amarelo" },
  { value: "pink", label: "Rosa" },
];

export default function SegmentDialog({ open, onOpenChange, segment }: SegmentDialogProps) {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const isEditing = !!segment;

  const form = useForm<SegmentFormData>({
    resolver: zodResolver(segmentSchema),
    defaultValues: {
      code: "",
      display_name: "",
      description: "",
      icon: "Layers",
      color: "gray",
      is_active: true,
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (segment) {
      form.reset({
        code: segment.code,
        display_name: segment.display_name,
        description: segment.description || "",
        icon: segment.icon || "Layers",
        color: segment.color || "gray",
        is_active: segment.is_active,
        sort_order: segment.sort_order,
      });
    } else {
      form.reset({
        code: "",
        display_name: "",
        description: "",
        icon: "Layers",
        color: "gray",
        is_active: true,
        sort_order: 0,
      });
    }
  }, [segment, form]);

  const createMutation = useMutation({
    mutationFn: async (data: SegmentFormData) => {
      const { error } = await supabase.from("segments").insert({
        tenant_id: tenantId,
        code: data.code.toUpperCase(),
        display_name: data.display_name,
        description: data.description || null,
        icon: data.icon,
        color: data.color,
        is_active: data.is_active,
        sort_order: data.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments"] });
      toast.success("Segmento criado com sucesso");
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Já existe um segmento com este código");
      } else {
        toast.error("Erro ao criar segmento: " + error.message);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SegmentFormData) => {
      if (!segment) return;
      const { error } = await supabase
        .from("segments")
        .update({
          code: data.code.toUpperCase(),
          display_name: data.display_name,
          description: data.description || null,
          icon: data.icon,
          color: data.color,
          is_active: data.is_active,
          sort_order: data.sort_order,
        })
        .eq("id", segment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments"] });
      toast.success("Segmento atualizado com sucesso");
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Já existe um segmento com este código");
      } else {
        toast.error("Erro ao atualizar segmento: " + error.message);
      }
    },
  });

  const onSubmit = (data: SegmentFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Handle code input to automatically uppercase
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "");
    form.setValue("code", value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Segmento" : "Novo Segmento"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: INFRA"
                        {...field}
                        onChange={handleCodeChange}
                        maxLength={10}
                      />
                    </FormControl>
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
            </div>

            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome de Exibição *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Infraestrutura" {...field} />
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
                      placeholder="Descrição do segmento..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AVAILABLE_ICONS.map((icon) => {
                          const IconComponent = icon.icon;
                          return (
                            <SelectItem key={icon.value} value={icon.value}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                {icon.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AVAILABLE_COLORS.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-4 w-4 rounded-full"
                                style={{
                                  backgroundColor: color.value === "gray" ? "#6b7280"
                                    : color.value === "blue" ? "#3b82f6"
                                    : color.value === "green" ? "#22c55e"
                                    : color.value === "orange" ? "#f97316"
                                    : color.value === "red" ? "#ef4444"
                                    : color.value === "purple" ? "#a855f7"
                                    : color.value === "yellow" ? "#eab308"
                                    : color.value === "pink" ? "#ec4899"
                                    : "#6b7280"
                                }}
                              />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Ativo</Label>
                    <p className="text-sm text-muted-foreground">
                      Segmento disponível para seleção
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
