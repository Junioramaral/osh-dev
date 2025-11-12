import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Lock } from "lucide-react";

interface ForcePasswordChangeProps {
  onPasswordChanged: () => void;
}

const ForcePasswordChange = ({ onPasswordChanged }: ForcePasswordChangeProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "A senha deve ter no mínimo 8 caracteres";
    }
    if (!/[A-Z]/.test(password)) {
      return "A senha deve conter pelo menos uma letra maiúscula";
    }
    if (!/[a-z]/.test(password)) {
      return "A senha deve conter pelo menos uma letra minúscula";
    }
    if (!/[0-9]/.test(password)) {
      return "A senha deve conter pelo menos um número";
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return "A senha deve conter pelo menos um caractere especial";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsLoading(true);

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Update user metadata to remove the must_change_password flag
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { must_change_password: false },
      });

      if (metadataError) {
        throw metadataError;
      }

      toast.success("Senha alterada com sucesso!");
      onPasswordChanged();
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} modal>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Trocar Senha Obrigatória</DialogTitle>
          <DialogDescription className="text-center">
            Por motivos de segurança, você precisa trocar sua senha temporária antes de continuar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Digite sua nova senha"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme sua nova senha"
              required
              disabled={isLoading}
            />
          </div>
          <div className="bg-muted p-3 rounded-md text-sm space-y-1">
            <p className="font-medium">A senha deve conter:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>No mínimo 8 caracteres</li>
              <li>Letras maiúsculas e minúsculas</li>
              <li>Pelo menos um número</li>
              <li>Pelo menos um caractere especial</li>
            </ul>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Alterando..." : "Alterar Senha"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ForcePasswordChange;
