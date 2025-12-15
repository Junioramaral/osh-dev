import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database } from "@/integrations/supabase/types";

type EnvironmentType = Database["public"]["Enums"]["environment_type"];
type CriticalityLevel = Database["public"]["Enums"]["criticality_level"];

const formSchema = z.object({
  client_id: z.string().min(1, "Selecione um cliente"),
  product_id: z.string().min(1, "Selecione um produto"),
  version: z.string().min(1, "Versão é obrigatória"),
  environment: z.enum(["prod", "hom", "qa", "dev"] as const, {
    required_error: "Selecione um ambiente",
  }),
  machine_id: z.string().nullable().optional(),
  criticality: z.enum(["baixa", "media", "alta", "critica"] as const).default("media"),
  active_modules: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

interface ApplicationInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance?: any;
}

const ENVIRONMENT_OPTIONS = [
  { value: "prod", label: "Produção" },
  { value: "hom", label: "Homologação" },
  { value: "qa", label: "QA" },
  { value: "dev", label: "Desenvolvimento" },
];

const CRITICALITY_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

export default function ApplicationInstanceDialog({
  open,
  onOpenChange,
  instance,
}: ApplicationInstanceDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!instance;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      product_id: "",
      version: "",
      environment: "dev",
      machine_id: null,
      criticality: "media",
      active_modules: [],
    },
  });

  const selectedClientId = form.watch("client_id");
  const selectedProductId = form.watch("product_id");

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["clients-for-instance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["products-for-instance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_products")
        .select("id, name, modules")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch machines for selected client
  const { data: machines } = useQuery({
    queryKey: ["machines-for-instance", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const { data, error } = await supabase
        .from("machines")
        .select("id, hostname")
        .eq("client_id", selectedClientId)
        .eq("status", "ativo")
        .order("hostname");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId,
  });

  // Get modules from selected product
  const selectedProduct = products?.find((p) => p.id === selectedProductId);
  const availableModules = selectedProduct?.modules as string[] | null;

  // Reset form when dialog opens/closes or instance changes
  useEffect(() => {
    if (open) {
      if (instance) {
        form.reset({
          client_id: instance.client_id || "",
          product_id: instance.product_id || "",
          version: instance.version || "",
          environment: instance.environment || "dev",
          machine_id: instance.machine_id || null,
          criticality: instance.criticality || "media",
          active_modules: instance.active_modules || [],
        });
      } else {
        form.reset({
          client_id: "",
          product_id: "",
          version: "",
          environment: "dev",
          machine_id: null,
          criticality: "media",
          active_modules: [],
        });
      }
    }
  }, [open, instance, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from("application_instances").insert({
        client_id: data.client_id,
        product_id: data.product_id,
        version: data.version,
        environment: data.environment as EnvironmentType,
        machine_id: data.machine_id || null,
        criticality: data.criticality as CriticalityLevel,
        active_modules: data.active_modules,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Implantação criada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["application-instances"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Erro ao criar implantação:", error);
      toast.error("Erro ao criar implantação");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase
        .from("application_instances")
        .update({
          client_id: data.client_id,
          product_id: data.product_id,
          version: data.version,
          environment: data.environment as EnvironmentType,
          machine_id: data.machine_id || null,
          criticality: data.criticality as CriticalityLevel,
          active_modules: data.active_modules,
        })
        .eq("id", instance?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Implantação atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["application-instances"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Erro ao atualizar implantação:", error);
      toast.error("Erro ao atualizar implantação");
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Implantação" : "Nova Implantação"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
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
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
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
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Versão *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 2.5.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ambiente *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ENVIRONMENT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                name="criticality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Criticidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CRITICALITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedClientId && machines && machines.length > 0 && (
              <FormField
                control={form.control}
                name="machine_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máquina (opcional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma máquina" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {machines.map((machine) => (
                          <SelectItem key={machine.id} value={machine.id}>
                            {machine.hostname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {availableModules && availableModules.length > 0 && (
              <FormField
                control={form.control}
                name="active_modules"
                render={() => (
                  <FormItem>
                    <FormLabel>Módulos Ativos</FormLabel>
                    <ScrollArea className="h-32 rounded-md border p-3">
                      <div className="space-y-2">
                        {availableModules.map((module) => (
                          <FormField
                            key={module}
                            control={form.control}
                            name="active_modules"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(module)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([...field.value, module]);
                                      } else {
                                        field.onChange(
                                          field.value?.filter((v) => v !== module)
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {module}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
