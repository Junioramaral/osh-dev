import { useEffect, useRef } from "react";
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
import { useCreateDatabase, useUpdateDatabase, type CreateDatabaseData, type UpdateDatabaseData } from "@/hooks/useDatabaseMutations";
import type { Tables } from "@/integrations/supabase/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const databaseSchema = z.object({
  client_id: z.string().uuid("Selecione um cliente"),
  machine_id: z.string().optional(),
  engine: z.string().min(1, "Selecione um engine"),
  version: z.string().min(1, "Versão é obrigatória"),
  instance_name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  endpoint: z.string().optional(),
  port: z.coerce.number().int().min(1).max(65535).optional().or(z.literal("")),
  environment: z.enum(["prod", "hom", "qa", "dev"], {
    required_error: "Selecione um ambiente",
  }),
  criticality: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
});

type DatabaseFormData = z.infer<typeof databaseSchema>;

interface DatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database?: Tables<"database_instances"> | null;
}

export default function DatabaseDialog({
  open,
  onOpenChange,
  database,
  lockedClientId,
}: DatabaseDialogProps) {
  const { isSuperAdmin, profile } = useAuth();
  const createDatabase = useCreateDatabase();
  const updateDatabase = useUpdateDatabase();
  
  const isEditMode = !!database;

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, db_engines, segments")
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
      engine: "PostgreSQL",
      version: "",
      instance_name: "",
      endpoint: "",
      port: "" as any,
      environment: "prod",
      criticality: "media",
    },
  });

  const selectedClientId = form.watch("client_id");
  const currentEngine = form.watch("engine");
  const selectedClient = clients?.find((c) => c.id === selectedClientId);
  const availableEngines = (selectedClient?.db_engines as string[] | null) || [];
  const clientHasDbSegment = !selectedClient || (selectedClient.segments || []).includes("DB");

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

  // Reset engine when selected client no longer supports it
  useEffect(() => {
    if (!selectedClientId || !clients) return;
    if (database) return; // don't override in edit mode
    if (!currentEngine) return;
    if (availableEngines.length === 0) {
      form.setValue("engine", "");
      return;
    }
    if (!availableEngines.includes(currentEngine)) {
      form.setValue("engine", "");
    }
  }, [selectedClientId, clients, currentEngine, availableEngines, database, form]);

  // Only reset the form on the open transition (false -> true), never when
  // `profile` reference changes (e.g. on tab focus / session revalidation),
  // otherwise user input is wiped out.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      if (database) {
        form.reset({
          client_id: database.client_id,
          machine_id: database.machine_id || "",
          engine: database.engine as any,
          version: database.version,
          instance_name: database.instance_name,
          endpoint: database.endpoint || "",
          port: database.port || ("" as any),
          environment: database.environment as any,
          criticality: database.criticality || "media",
        });
      } else {
        form.reset({
          client_id: profile?.client_id || "",
          machine_id: "",
          engine: "PostgreSQL",
          version: "",
          instance_name: "",
          endpoint: "",
          port: "" as any,
          environment: "prod",
          criticality: "media",
        });
      }
    }
    wasOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, database?.id]);

  const onSubmit = (data: DatabaseFormData) => {
    const submitData = {
      ...data,
      port: data.port === "" ? undefined : data.port,
    };
    
    if (isEditMode && database) {
      updateDatabase.mutate(
        { id: database.id, data: submitData as UpdateDatabaseData },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createDatabase.mutate(submitData as CreateDatabaseData, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  };
  
  const isPending = createDatabase.isPending || updateDatabase.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar Instância de Banco de Dados" : "Nova Instância de Banco de Dados"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Atualize as informações da instância de banco de dados."
              : "Cadastre uma nova instância de banco de dados no catálogo."}
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

            {selectedClient && !clientHasDbSegment && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este cliente não possui o segmento <strong>DB</strong> ativo. Ative o segmento no cadastro do cliente antes de adicionar instâncias de banco.
                </AlertDescription>
              </Alert>
            )}

            {selectedClient && clientHasDbSegment && availableEngines.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum engine cadastrado para este cliente. Edite o cliente e selecione os engines contratados.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="engine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engine *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedClientId || availableEngines.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedClientId
                                ? "Selecione o cliente primeiro"
                                : availableEngines.length === 0
                                ? "Nenhum engine disponível"
                                : "Selecione o engine"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                    <SelectContent>
                      {availableEngines.map((eng) => (
                        <SelectItem key={eng} value={eng}>
                          {eng}
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
                        <SelectItem value="prod">Produção</SelectItem>
                        <SelectItem value="hom">Homologação</SelectItem>
                        <SelectItem value="qa">QA</SelectItem>
                        <SelectItem value="dev">Desenvolvimento</SelectItem>
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
                        <SelectItem value="critica">Crítica</SelectItem>
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
              <Button type="submit" disabled={isPending || !clientHasDbSegment || availableEngines.length === 0}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? "Atualizar Instância" : "Criar Instância"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
