import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useCreateClient, useUpdateClient } from "@/hooks/useClientMutations";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;

const clientSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cnpj: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  status: z.string().default("ativo"),
  tenant_type: z.string().default("customer"),
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

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      cnpj: "",
      domain: "",
      status: "ativo",
      tenant_type: "customer",
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
      form.reset({
        name: client.name,
        cnpj: client.cnpj || "",
        domain: client.domain || "",
        status: client.status || "ativo",
        tenant_type: client.tenant_type || "customer",
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
      form.reset();
    }
  }, [mode, client, form]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      const clientData = {
        ...data,
        cnpj: data.cnpj || null,
        domain: data.domain || null,
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
          <DialogTitle>
            {mode === "create" ? "Novo Cliente" : `Editar Cliente: ${client?.name}`}
          </DialogTitle>
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
