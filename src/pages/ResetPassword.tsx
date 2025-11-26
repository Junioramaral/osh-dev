import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Database, Server, KeyRound } from "lucide-react";

const ResetPassword = () => {
  const { updatePassword, user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    // Se não há usuário, redirecionar para login
    if (!user) {
      toast.error("Sessão inválida", {
        description: "Por favor, clique no link do email novamente.",
      });
      navigate("/auth");
    }
  }, [user, navigate]);

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
    return null;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validações
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      setIsLoading(false);
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      toast.error("Senha inválida", {
        description: validationError,
      });
      setIsLoading(false);
      return;
    }

    const { error } = await updatePassword(newPassword);

    if (error) {
      toast.error("Erro ao redefinir senha", {
        description: error.message,
      });
    } else {
      toast.success("Senha redefinida com sucesso!", {
        description: "Você será redirecionado para o dashboard.",
      });
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-lg">
              <Server className="w-6 h-6 text-primary-foreground" />
            </div>
            <Database className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Otimizzo Service Hub</h1>
          <p className="text-muted-foreground mt-2">Redefinir Senha</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Nova Senha
            </CardTitle>
            <CardDescription>
              Escolha uma senha forte para sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                <p className="font-semibold">Requisitos da senha:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Mínimo de 8 caracteres</li>
                  <li>Pelo menos uma letra maiúscula</li>
                  <li>Pelo menos uma letra minúscula</li>
                  <li>Pelo menos um número</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Redefinindo..." : "Redefinir Senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
