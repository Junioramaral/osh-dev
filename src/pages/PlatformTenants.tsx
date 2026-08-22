import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cleanPhone, isValidPhone } from "@/lib/phoneUtils";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_platform_owner: boolean;
  created_at: string;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function PlatformTenants() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    owner_name: "",
    owner_email: "",
    owner_phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["platform-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, is_active, is_platform_owner, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tenant[];
    },
  });

  const createTenant = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-tenant", {
        body: {
          name: form.name,
          slug: form.slug,
          owner_name: form.owner_name,
          owner_email: form.owner_email,
          owner_phone: form.owner_phone ? cleanPhone(form.owner_phone) : undefined,
        },
      });
      if (error) {
        // supabase-js só expõe uma mensagem genérica ("non-2xx status
        // code") em error.message — o corpo real da resposta (com o
        // motivo de verdade) vem em error.context, que é o Response cru.
        if (error.context && typeof error.context.json === "function") {
          try {
            const body = await error.context.json();
            throw new Error(body?.error || error.message);
          } catch {
            throw error;
          }
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Tenant "${form.name}" criado com sucesso`, {
        description: `Convite enviado para ${form.owner_email}`,
      });
      queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
      setIsCreateOpen(false);
      setForm({ name: "", slug: "", owner_name: "", owner_email: "", owner_phone: "" });
      setSlugTouched(false);
      setErrors({});
      if (data?.tenant?.id) {
        navigate(`/platform/tenants/${data.tenant.id}`);
      }
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar tenant", { description: error.message });
    },
  });

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Nome é obrigatório";
    if (!form.slug.trim()) next.slug = "Slug é obrigatório";
    else if (!/^[a-z0-9-]+$/.test(form.slug)) next.slug = "Use só letras minúsculas, números e hífen";
    if (!form.owner_name.trim()) next.owner_name = "Nome do owner é obrigatório";
    if (!form.owner_email.trim()) next.owner_email = "Email é obrigatório";
    if (form.owner_phone && !isValidPhone(form.owner_phone)) next.owner_phone = "Telefone inválido";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createTenant.mutate();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tenants da Plataforma</h1>
            <p className="text-muted-foreground">
              Consultorias que operam o OSH — cada uma com seus próprios clients, times e tickets.
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Tenant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar novo tenant</DialogTitle>
                <DialogDescription>
                  Cria o tenant e convida o primeiro usuário como owner dele.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
                    }}
                    onBlur={validate}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm((f) => ({ ...f, slug: e.target.value }));
                    }}
                    onBlur={validate}
                  />
                  {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_name">Nome do owner *</Label>
                  <Input
                    id="owner_name"
                    value={form.owner_name}
                    onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
                    onBlur={validate}
                  />
                  {errors.owner_name && <p className="text-sm text-destructive">{errors.owner_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_email">Email do owner *</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    autoComplete="email"
                    value={form.owner_email}
                    onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))}
                    onBlur={validate}
                  />
                  {errors.owner_email && <p className="text-sm text-destructive">{errors.owner_email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_phone">Telefone do owner</Label>
                  <PhoneInput
                    id="owner_phone"
                    value={form.owner_phone}
                    onChange={(e) => setForm((f) => ({ ...f, owner_phone: e.target.value }))}
                    onBlur={validate}
                  />
                  {errors.owner_phone && <p className="text-sm text-destructive">{errors.owner_phone}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createTenant.isPending}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={createTenant.isPending}>
                  {createTenant.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar tenant
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Lista de todas as consultorias na plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !tenants?.length ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                <Building2 className="h-10 w-10" />
                <p>Nenhum tenant ainda além da Otimizzo.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                        <TableCell>
                          <Badge variant={tenant.is_active ? "default" : "destructive"}>
                            {tenant.is_active ? "Ativo" : "Suspenso"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tenant.is_platform_owner ? (
                            <Badge variant="secondary">Dono da plataforma</Badge>
                          ) : (
                            <span className="text-muted-foreground">Cliente</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(tenant.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/platform/tenants/${tenant.id}`)}>
                            Ver detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
