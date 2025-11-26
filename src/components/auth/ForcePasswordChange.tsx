import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Lock, ShieldAlert, Check, X } from "lucide-react";

interface ForcePasswordChangeProps {
  onPasswordChanged: () => void;
}

const ForcePasswordChange = ({ onPasswordChanged }: ForcePasswordChangeProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Validação em tempo real com status de cada requisito
  const passwordRequirements = useMemo(() => ({
    length: {
      label: "No mínimo 8 caracteres",
      met: newPassword.length >= 8,
    },
    uppercase: {
      label: "Letra maiúscula",
      met: /[A-Z]/.test(newPassword),
    },
    lowercase: {
      label: "Letra minúscula",
      met: /[a-z]/.test(newPassword),
    },
    number: {
      label: "Pelo menos um número",
      met: /[0-9]/.test(newPassword),
    },
    special: {
      label: "Caractere especial",
      met: /[^A-Za-z0-9]/.test(newPassword),
    },
  }), [newPassword]);

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
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <CardTitle>Trocar Senha Obrigatória</CardTitle>
        <CardDescription>
          Por motivos de segurança, você precisa trocar sua senha temporária antes de continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Banner informativo de primeiro acesso */}
        <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">Primeiro Acesso</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Você está usando uma senha temporária. Crie uma senha pessoal para continuar.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  required
                  disabled={isLoading}
                />
              </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme sua nova senha"
              required
              disabled={isLoading}
            />
          </div>

          {/* Checklist dinâmico de requisitos */}
          <div className="bg-muted/50 p-4 rounded-md space-y-2">
            <p className="font-medium text-sm mb-3">A senha deve conter:</p>
            <ul className="space-y-2">
              {Object.entries(passwordRequirements).map(([key, req]) => (
                <li key={key} className="flex items-center gap-2 text-sm">
                  {req.met ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={req.met ? "text-foreground" : "text-muted-foreground"}>
                    {req.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Criando Senha..." : "Criar Minha Senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ForcePasswordChange;
