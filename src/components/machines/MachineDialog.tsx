import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useCreateMachine, useUpdateMachine } from "@/hooks/useMachineMutations";
import { Tables } from "@/integrations/supabase/types";

const machineSchema = z.object({
  client_id: z.string().uuid("Selecione um cliente"),
  environment: z.enum(["prod", "hom", "qa", "dev"]),
  operating_system: z.enum(["Linux", "Windows", "AIX"]),
  hostname: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  ip_address: z
    .string()
    .regex(
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/,
      "IP inválido (ex: 192.168.1.100)"
    )
    .optional()
    .or(z.literal("")),
  root_username: z.string().optional(),
  root_password: z.string().optional(),
  machine_type: z.enum(["servidor", "vm", "desktop", "cloud"]),
  criticality: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
  description: z.string().optional(),
});

type MachineFormData = z.infer<typeof machineSchema>;

interface AdditionalUser {
  id: string;
  username: string;
  password: string;
  description: string;
  showPassword: boolean;
}

interface MachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine?: Tables<"machines"> | null;
}

export default function MachineDialog({
  open,
  onOpenChange,
  machine,
}: MachineDialogProps) {
  const { isSuperAdmin, profile } = useAuth();
  const createMachine = useCreateMachine();
  const updateMachine = useUpdateMachine();
  const [additionalUsers, setAdditionalUsers] = useState<AdditionalUser[]>([]);
  const [showRootPassword, setShowRootPassword] = useState(false);

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

  const form = useForm<MachineFormData>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      client_id: profile?.client_id || "",
      environment: "prod",
      operating_system: "Linux",
      hostname: "",
      ip_address: "",
      root_username: "root",
      root_password: "",
      machine_type: "servidor",
      criticality: "media",
      description: "",
    },
  });

  useEffect(() => {
    if (!isSuperAdmin && profile?.client_id) {
      form.setValue("client_id", profile.client_id);
    }
  }, [isSuperAdmin, profile, form]);

  useEffect(() => {
    if (machine && open) {
      form.setValue("client_id", machine.client_id);
      form.setValue("environment", machine.environment as any);
      form.setValue("operating_system", machine.operating_system as any);
      form.setValue("hostname", machine.hostname);
      form.setValue("ip_address", machine.ip_address || "");
      form.setValue("root_username", machine.root_username || "");
      form.setValue("machine_type", machine.machine_type as any);
      form.setValue("criticality", (machine.criticality || "media") as any);
      form.setValue("description", machine.description || "");
      
      // Descriptografar senha root se existir
      if (machine.root_password_secret_id) {
        supabase.functions.invoke('machine-secrets', {
          body: {
            action: 'decrypt',
            secretId: machine.root_password_secret_id
          }
        }).then(({ data, error }) => {
          if (error) {
            console.error('Erro ao descriptografar senha root:', error);
            form.setValue("root_password", "");
          } else if (data?.password) {
            form.setValue("root_password", data.password);
          }
        });
      } else {
        form.setValue("root_password", "");
      }
      
      // Descriptografar senhas de additional_users
      if (machine.additional_users) {
        const users = Array.isArray(machine.additional_users) 
          ? machine.additional_users 
          : [];
        
        const decryptPromises = users.map(async (user: any) => {
          if (user.password_secret_id) {
            const { data, error } = await supabase.functions.invoke('machine-secrets', {
              body: {
                action: 'decrypt',
                secretId: user.password_secret_id
              }
            });
            
            if (error) {
              console.error(`Erro ao descriptografar senha do usuário ${user.username}:`, error);
              return {
                id: crypto.randomUUID(),
                username: user.username || "",
                password: "",
                description: user.description || "",
                showPassword: false,
              };
            }
            
            return {
              id: crypto.randomUUID(),
              username: user.username || "",
              password: data?.password || "",
              description: user.description || "",
              showPassword: false,
            };
          }
          return {
            id: crypto.randomUUID(),
            username: user.username || "",
            password: user.password || "",
            description: user.description || "",
            showPassword: false,
          };
        });

        Promise.all(decryptPromises).then(decryptedUsers => {
          setAdditionalUsers(decryptedUsers);
        });
      }
    } else if (!open) {
      form.reset();
      setAdditionalUsers([]);
    }
  }, [machine, open, form]);

  const handleAddUser = () => {
    setAdditionalUsers([
      ...additionalUsers,
      {
        id: crypto.randomUUID(),
        username: "",
        password: "",
        description: "",
        showPassword: false,
      },
    ]);
  };

  const handleRemoveUser = (id: string) => {
    setAdditionalUsers(additionalUsers.filter((user) => user.id !== id));
  };

  const handleUserChange = (
    id: string,
    field: keyof AdditionalUser,
    value: string | boolean
  ) => {
    setAdditionalUsers(
      additionalUsers.map((user) =>
        user.id === id ? { ...user, [field]: value } : user
      )
    );
  };

  const onSubmit = (data: MachineFormData) => {
    const validUsers = additionalUsers.filter(
      (user) => user.username.trim() && user.password.trim()
    );

    const machineData = {
      client_id: data.client_id,
      environment: data.environment,
      operating_system: data.operating_system,
      hostname: data.hostname,
      ip_address: data.ip_address,
      root_username: data.root_username,
      root_password: data.root_password,
      machine_type: data.machine_type,
      criticality: data.criticality,
      description: data.description,
      additional_users: validUsers.map(({ id, showPassword, ...user }) => user),
    };

    if (machine) {
      updateMachine.mutate(
        { id: machine.id, data: machineData, originalMachine: machine },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
            setAdditionalUsers([]);
          },
        }
      );
    } else {
      createMachine.mutate(
        machineData,
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
            setAdditionalUsers([]);
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{machine ? "Editar Máquina" : "Nova Máquina"}</DialogTitle>
          <DialogDescription>
            {machine 
              ? "Atualize as informações da máquina no catálogo de infraestrutura."
              : "Cadastre uma nova máquina no catálogo de infraestrutura. Todas as informações são protegidas por controle de acesso."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        <SelectItem value="dev">Desenvolvimento</SelectItem>
                        <SelectItem value="qa">Teste</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="operating_system"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sistema Operacional *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Linux">Linux</SelectItem>
                        <SelectItem value="Windows">Windows</SelectItem>
                        <SelectItem value="AIX">AIX</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="machine_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="servidor">Servidor</SelectItem>
                        <SelectItem value="vm">Máquina Virtual</SelectItem>
                        <SelectItem value="desktop">Desktop</SelectItem>
                        <SelectItem value="cloud">Cloud</SelectItem>
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

              <FormField
                control={form.control}
                name="hostname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Máquina *</FormLabel>
                    <FormControl>
                      <Input placeholder="srv-prod-db01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ip_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço IP</FormLabel>
                    <FormControl>
                      <Input placeholder="192.168.1.100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-sm">🔐 Credenciais Root (Opcional)</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="root_username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuário Root</FormLabel>
                      <FormControl>
                        <Input placeholder="root" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="root_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha Root</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showRootPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowRootPassword(!showRootPassword)}
                        >
                          {showRootPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        🔒 Acesso restrito por RLS
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">👥 Usuários Adicionais</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddUser}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Usuário
                </Button>
              </div>

              {additionalUsers.map((user, index) => (
                <div
                  key={user.id}
                  className="border rounded-lg p-4 space-y-3 bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Usuário {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveUser(user.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">
                        Nome de Usuário *
                      </label>
                      <Input
                        placeholder="usuario1"
                        value={user.username}
                        onChange={(e) =>
                          handleUserChange(user.id, "username", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Senha *</label>
                      <div className="relative">
                        <Input
                          type={user.showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={user.password}
                          onChange={(e) =>
                            handleUserChange(user.id, "password", e.target.value)
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() =>
                            handleUserChange(
                              user.id,
                              "showPassword",
                              !user.showPassword
                            )
                          }
                        >
                          {user.showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Descrição</label>
                    <Input
                      placeholder="Ex: Usuário de backup"
                      value={user.description}
                      onChange={(e) =>
                        handleUserChange(user.id, "description", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}

              {additionalUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum usuário adicional configurado
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre a máquina..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMachine.isPending || updateMachine.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMachine.isPending || updateMachine.isPending}>
                {(createMachine.isPending || updateMachine.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {machine ? "Atualizar" : "Criar Máquina"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
