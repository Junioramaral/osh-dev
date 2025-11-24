import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCreateDatabase, type CreateDatabaseData } from "@/hooks/useDatabaseMutations";

const databaseSchema = z.object({
  client_id: z.string().uuid("Selecione um cliente"),
  machine_id: z.string().optional(),
  engine: z.enum(["oracle", "postgresql", "mysql", "mongodb", "sqlserver"], {
    required_error: "Selecione um engine",
  }),
  version: z.string().min(1, "Versão é obrigatória"),
  instance_name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  endpoint: z.string().optional(),
  port: z.coerce.number().int().min(1).max(65535).optional().or(z.literal("")),
  environment: z.enum(["producao", "homologacao", "desenvolvimento"], {
    required_error: "Selecione um ambiente",
  }),
  criticality: z.enum(["baixa", "media", "alta"]).default("media"),
});

type DatabaseFormData = z.infer<typeof databaseSchema>;

interface DatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DatabaseDialog({
  open,
  onOpenChange,
}: DatabaseDialogProps) {
  const { isSuperAdmin, profile } = useAuth();
  const createDatabase = useCreateDatabase();

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const form = useForm<DatabaseFormData>({
    resolver: zodResolver(databaseSchema),
    defaultValues: {
      client_id: profile?.client_id || "",
      machine_id: "",
      engine: "postgresql",
      version: "",
      instance_name: "",
      endpoint: "",
      port: "" as any,
      environment: "producao",
      criticality: "media",
    },
  });

  const selectedClientId = form.watch("client_id");

  const { data: machines } = useQuery({
    queryKey: ["machines", selectedClientId],
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
    enabled: open && !!selectedClientId,
  });

  useEffect(() => {
    if (!isSuperAdmin && profile?.client_id) {
      form.setValue("client_id", profile.client_id);
    }
  }, [isSuperAdmin, profile, form]);

  const onSubmit = (data: DatabaseFormData) => {
    const submitData = {
      ...data,
      port: data.port === "" ? undefined : data.port,
    };
    createDatabase.mutate(submitData as CreateDatabaseData, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Instância de Banco de Dados</DialogTitle>
          <DialogDescription>
            Cadastre uma nova instância de banco de dados no catálogo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!isSuperAdmin}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="engine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engine *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="postgresql">PostgreSQL</SelectItem>
                        <SelectItem value="mysql">MySQL</SelectItem>
                        <SelectItem value="oracle">Oracle</SelectItem>
                        <SelectItem value="mongodb">MongoDB</SelectItem>
                        <SelectItem value="sqlserver">SQL Server</SelectItem>
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
                      <Input placeholder="Ex: 15.4, 8.0.35" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="instance_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Instância *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: postgres-prod-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ambiente *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="producao">Produção</SelectItem>
                        <SelectItem value="homologacao">Homologação</SelectItem>
                        <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
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
                    <FormLabel>Criticidade *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="endpoint"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Endpoint</FormLabel>
                    <FormControl>
                      <Input placeholder="db.exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porta</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5432"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? "" : Number(value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="machine_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máquina (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma máquina" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {machines?.map((machine) => (
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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createDatabase.isPending}>
                {createDatabase.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Criar Instância
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
