import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Database, Package } from "lucide-react";
import { useCreateClient, useUpdateClient } from "@/hooks/useClientMutations";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;

const clientSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cnpj: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  status: z.string().default("ativo"),
  tenant_type: z.string().default("customer"),
  segments: z.array(z.string()).default([]),
  db_engines: z.array(z.string()).default([]),
  app_product_ids: z.array(z.string()).default([]),
  max_users: z.coerce.number().min(1, "Mínimo 1 usuário").default(10),
  contract_start_date: z.string().nullable().optional(),
  contract_end_date: z.string().nullable().optional(),
  sla_db_p1_first_response: z.coerce.number().min(1).default(15),
  sla_db_p1_resolution: z.coerce.number().min(1).default(240),
  sla_db_p2_first_response: z.coerce.number().min(1).default(30),
  sla_db_p2_resolution: z.coerce.number().min(1).default(480),
  sla_db_p3_first_response: z.coerce.number().min(1).default(60),
  sla_db_p3_resolution: z.coerce.number().min(1).default(960),
  sla_db_p4_first_response: z.coerce.number().min(1).default(120),
  sla_db_p4_resolution: z.coerce.number().min(1).default(1920),
  sla_app_p1_first_response: z.coerce.number().min(1).default(15),
  sla_app_p1_resolution: z.coerce.number().min(1).default(240),
  sla_app_p2_first_response: z.coerce.number().min(1).default(30),
  sla_app_p2_resolution: z.coerce.number().min(1).default(480),
  sla_app_p3_first_response: z.coerce.number().min(1).default(60),
  sla_app_p3_resolution: z.coerce.number().min(1).default(960),
  sla_app_p4_first_response: z.coerce.number().min(1).default(120),
  sla_app_p4_resolution: z.coerce.number().min(1).default(1920),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  client: Client | null;
}

export default function ClientDialog({ open, onOpenChange, mode, client }: ClientDialogProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);

  const { data: appProducts } = useQuery({
    queryKey: ["application_products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("application_products").select("id, name, description").order("name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      cnpj: "",
      domain: "",
      status: "ativo",
      tenant_type: "customer",
      segments: [],
      db_engines: [],
      app_product_ids: [],
      max_users: 10,
      contract_start_date: "",
      contract_end_date: "",
      sla_db_p1_first_response: 15,
      sla_db_p1_resolution: 240,
      sla_db_p2_first_response: 30,
      sla_db_p2_resolution: 480,
      sla_db_p3_first_response: 60,
      sla_db_p3_resolution: 960,
      sla_db_p4_first_response: 120,
      sla_db_p4_resolution: 1920,
      sla_app_p1_first_response: 15,
      sla_app_p1_resolution: 240,
      sla_app_p2_first_response: 30,
      sla_app_p2_resolution: 480,
      sla_app_p3_first_response: 60,
      sla_app_p3_resolution: 960,
      sla_app_p4_first_response: 120,
      sla_app_p4_resolution: 1920,
    },
  });

  useEffect(() => {
    if (mode === "edit" && client) {
      setSelectedSegments(client.segments || []);
      form.reset({
        name: client.name,
        cnpj: client.cnpj || "",
        domain: client.domain || "",
        status: client.status || "ativo",
        tenant_type: client.tenant_type || "customer",
        segments: client.segments || [],
        db_engines: client.db_engines || [],
        app_product_ids: client.app_product_ids || [],
        max_users: client.max_users || 10,
        contract_start_date: client.contract_start_date || "",
        contract_end_date: client.contract_end_date || "",
        sla_db_p1_first_response: client.sla_db_p1_first_response || 15,
        sla_db_p1_resolution: client.sla_db_p1_resolution || 240,
        sla_db_p2_first_response: client.sla_db_p2_first_response || 30,
        sla_db_p2_resolution: client.sla_db_p2_resolution || 480,
        sla_db_p3_first_response: client.sla_db_p3_first_response || 60,
        sla_db_p3_resolution: client.sla_db_p3_resolution || 960,
        sla_db_p4_first_response: client.sla_db_p4_first_response || 120,
        sla_db_p4_resolution: client.sla_db_p4_resolution || 1920,
        sla_app_p1_first_response: client.sla_app_p1_first_response || 15,
        sla_app_p1_resolution: client.sla_app_p1_resolution || 240,
        sla_app_p2_first_response: client.sla_app_p2_first_response || 30,
        sla_app_p2_resolution: client.sla_app_p2_resolution || 480,
        sla_app_p3_first_response: client.sla_app_p3_first_response || 60,
        sla_app_p3_resolution: client.sla_app_p3_resolution || 960,
        sla_app_p4_first_response: client.sla_app_p4_first_response || 120,
        sla_app_p4_resolution: client.sla_app_p4_resolution || 1920,
      });
    } else {
      setSelectedSegments([]);
      form.reset();
    }
  }, [mode, client, form]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      const clientData = {
        ...data,
        cnpj: data.cnpj || null,
        domain: data.domain || null,
        segments: data.segments || [],
        db_engines: data.db_engines || [],
        app_product_ids: data.app_product_ids || [],
        contract_start_date: data.contract_start_date || null,
        contract_end_date: data.contract_end_date || null,
      };

      if (mode === "create") {
        await createClient.mutateAsync(clientData as any);
      } else if (client) {
        await updateClient.mutateAsync({ id: client.id, data: clientData as any });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error saving client:", error);
    }
  };

  const isLoading = createClient.isPending || updateClient.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo Cliente" : `Editar Cliente: ${client?.name}`}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
                <TabsTrigger value="contract">Contrato</TabsTrigger>
                <TabsTrigger value="sla">SLAs</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome do cliente" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00.000.000/0000-00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domínio</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="exemplo.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                            <SelectItem value="suspenso">Suspenso</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tenant_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Tenant</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="customer">Cliente</SelectItem>
                            <SelectItem value="internal">Interno</SelectItem>
                            <SelectItem value="partner">Parceiro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Seção de Segmentos - Grid com checkboxes alinhados às suas colunas */}
                <FormField
                  control={form.control}
                  name="segments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Segmentos</FormLabel>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Coluna Esquerda: Banco de Dados */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="segment-db"
                              checked={field.value.includes("DB")}
                              onCheckedChange={(checked) => {
                                const newSegments = checked
                                  ? [...field.value, "DB"]
                                  : field.value.filter((s) => s !== "DB");
                                field.onChange(newSegments);
                                setSelectedSegments(newSegments);
                                if (!checked) {
                                  form.setValue("db_engines", []);
                                }
                              }}
                            />
                            <label htmlFor="segment-db" className="text-sm font-medium cursor-pointer">
                              Banco de Dados (DB)
                            </label>
                          </div>

                          {/* Engines de Banco (condicional) */}
                          {selectedSegments.includes("DB") && (
                            <FormField
                              control={form.control}
                              name="db_engines"
                              render={({ field: engineField }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2 text-sm">
                                    <Database className="h-4 w-4 text-blue-500" />
                                    Engines de Banco ({engineField.value.length})
                                  </FormLabel>
                                  <div className="space-y-3 border rounded-md p-4 bg-muted/20">
                                    {["PostgreSQL", "MySQL", "SQL Server", "Oracle", "MongoDB"].map((engine) => (
                                      <div key={engine} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`engine-${engine}`}
                                          checked={engineField.value.includes(engine)}
                                          onCheckedChange={(checked) => {
                                            const newEngines = checked
                                              ? [...engineField.value, engine]
                                              : engineField.value.filter((e) => e !== engine);
                                            engineField.onChange(newEngines);
                                          }}
                                        />
                                        <label htmlFor={`engine-${engine}`} className="text-sm cursor-pointer">
                                          {engine}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        {/* Coluna Direita: Aplicação */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="segment-app"
                              checked={field.value.includes("APP")}
                              onCheckedChange={(checked) => {
                                const newSegments = checked
                                  ? [...field.value, "APP"]
                                  : field.value.filter((s) => s !== "APP");
                                field.onChange(newSegments);
                                setSelectedSegments(newSegments);
                                if (!checked) {
                                  form.setValue("app_product_ids", []);
                                }
                              }}
                            />
                            <label htmlFor="segment-app" className="text-sm font-medium cursor-pointer">
                              Aplicação (APP)
                            </label>
                          </div>

                          {/* Produtos de Aplicação (condicional) */}
                          {selectedSegments.includes("APP") && (
                            <FormField
                              control={form.control}
                              name="app_product_ids"
                              render={({ field: productField }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2 text-sm">
                                    <Package className="h-4 w-4 text-green-500" />
                                    Produtos de Aplicação ({productField.value.length})
                                  </FormLabel>
                                  <div className="space-y-3 border rounded-md p-4 bg-muted/20 max-h-64 overflow-y-auto">
                                    {appProducts?.map((product) => (
                                      <div key={product.id} className="flex items-start space-x-3">
                                        <Checkbox
                                          id={`app-${product.id}`}
                                          checked={productField.value.includes(product.id)}
                                          onCheckedChange={(checked) => {
                                            const newProducts = checked
                                              ? [...productField.value, product.id]
                                              : productField.value.filter((id) => id !== product.id);
                                            productField.onChange(newProducts);
                                          }}
                                        />
                                        <div className="flex flex-col min-w-0">
                                          <label htmlFor={`app-${product.id}`} className="text-sm font-medium cursor-pointer">
                                            {product.name}
                                          </label>
                                          {product.description && (
                                            <span className="text-xs text-muted-foreground line-clamp-2">
                                              {product.description}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="contract" className="space-y-4">
                <FormField
                  control={form.control}
                  name="max_users"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo de Usuários</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={1} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contract_start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contract_end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Término</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="sla" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">SLA Database (minutos)</h3>
                  {["p1", "p2", "p3", "p4"].map((priority) => (
                    <div key={priority} className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`sla_db_${priority}_first_response` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{priority.toUpperCase()} - Primeira Resposta</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min={1} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`sla_db_${priority}_resolution` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{priority.toUpperCase()} - Resolução</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min={1} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">SLA Aplicação (minutos)</h3>
                  {["p1", "p2", "p3", "p4"].map((priority) => (
                    <div key={priority} className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`sla_app_${priority}_first_response` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{priority.toUpperCase()} - Primeira Resposta</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min={1} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`sla_app_${priority}_resolution` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{priority.toUpperCase()} - Resolução</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min={1} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Criar Cliente" : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
