import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cleanPhone, isValidPhone } from "@/lib/phoneUtils";

interface TenantContact {
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: string;
}

const roleLabels: Record<string, string> = {
  tenant_admin: "Tenant Admin",
  analyst_db: "Analista DB",
  analyst_app: "Analista APP",
};

interface TenantContactsSectionProps {
  tenantId: string;
}

export function TenantContactsSection({ tenantId }: TenantContactsSectionProps) {
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", phone: "", role: "analyst_db" });
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});

  const { data: contacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["tenant-contacts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_tenant_contacts", {
        p_tenant_id: tenantId,
      });
      if (error) throw error;
      return data as TenantContact[];
    },
    enabled: !!tenantId,
  });

  const inviteTenantUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("invite-tenant-user", {
        body: {
          tenant_id: tenantId,
          email: inviteForm.email,
          full_name: inviteForm.name,
          phone: inviteForm.phone ? cleanPhone(inviteForm.phone) : undefined,
          role: inviteForm.role,
        },
      });
      if (error) {
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
    onSuccess: () => {
      toast.success(`Convite enviado para ${inviteForm.email}`);
      queryClient.invalidateQueries({ queryKey: ["tenant-contacts", tenantId] });
      setIsInviteOpen(false);
      setInviteForm({ name: "", email: "", phone: "", role: "analyst_db" });
      setInviteErrors({});
    },
    onError: (error: Error) => {
      toast.error("Erro ao convidar membro", { description: error.message });
    },
  });

  const validateInvite = () => {
    const next: Record<string, string> = {};
    if (!inviteForm.name.trim()) next.name = "Nome é obrigatório";
    if (!inviteForm.email.trim()) next.email = "Email é obrigatório";
    if (inviteForm.phone && !isValidPhone(inviteForm.phone)) next.phone = "Telefone inválido";
    setInviteErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleInviteSubmit = () => {
    if (!validateInvite()) return;
    inviteTenantUser.mutate();
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="h-4 w-4" />
          Equipe do tenant
        </h3>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar membro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar membro da equipe</DialogTitle>
              <DialogDescription>
                Cria um usuário e vincula a este tenant com o papel escolhido.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Nome completo *</Label>
                <Input
                  id="invite-name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                />
                {inviteErrors.name && <p className="text-sm text-destructive">{inviteErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                />
                {inviteErrors.email && <p className="text-sm text-destructive">{inviteErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-phone">Telefone (opcional)</Label>
                <PhoneInput
                  id="invite-phone"
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm((f) => ({ ...f, phone: e.target.value }))}
                />
                {inviteErrors.phone && <p className="text-sm text-destructive">{inviteErrors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Papel *</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) => setInviteForm((f) => ({ ...f, role: value }))}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant_admin">Admin do Tenant</SelectItem>
                    <SelectItem value="analyst_db">Analista DB</SelectItem>
                    <SelectItem value="analyst_app">Analista APP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsInviteOpen(false)}
                disabled={inviteTenantUser.isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleInviteSubmit} disabled={inviteTenantUser.isPending}>
                {inviteTenantUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Convidar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoadingContacts ? (
        <Skeleton className="h-20 w-full" />
      ) : !contacts?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum usuário vinculado a este tenant ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Papel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.user_id}>
                  <TableCell className="font-medium">{contact.full_name || "—"}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.phone || "—"}</TableCell>
                  <TableCell>{roleLabels[contact.role] || contact.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
