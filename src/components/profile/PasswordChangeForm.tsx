import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Rule {
  label: string;
  test: (v: string) => boolean;
}

const rules: Rule[] = [
  { label: "Mínimo de 8 caracteres", test: (v) => v.length >= 8 },
  { label: "Pelo menos 1 letra maiúscula", test: (v) => /[A-Z]/.test(v) },
  { label: "Pelo menos 1 número", test: (v) => /\d/.test(v) },
  { label: "Pelo menos 1 caractere especial", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function PasswordChangeForm() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const ruleResults = useMemo(
    () => rules.map((r) => ({ ...r, ok: r.test(newPassword) })),
    [newPassword]
  );
  const passedCount = ruleResults.filter((r) => r.ok).length;
  const allValid = passedCount === rules.length;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const sameAsCurrent = newPassword.length > 0 && newPassword === currentPassword;

  const strengthLabel =
    passedCount <= 1 ? "Fraca" : passedCount <= 2 ? "Razoável" : passedCount === 3 ? "Boa" : "Forte";
  const strengthColor =
    passedCount <= 1
      ? "bg-destructive"
      : passedCount <= 2
      ? "bg-yellow-500"
      : passedCount === 3
      ? "bg-blue-500"
      : "bg-green-500";

  const canSubmit =
    !!currentPassword && allValid && passwordsMatch && !sameAsCurrent && !saving;

  const handleSubmit = async () => {
    if (!user?.email) return;
    setSaving(true);
    try {
      // Reautentica para validar a senha atual
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) {
        toast.error("Senha atual incorreta");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        const msg = updateError.message?.toLowerCase().includes("weak")
          ? "A nova senha é muito fraca. Tente uma combinação mais forte."
          : updateError.message?.toLowerCase().includes("same")
          ? "A nova senha deve ser diferente da atual."
          : "Não foi possível alterar a senha. Tente novamente.";
        toast.error(msg);
        return;
      }

      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      console.error("Error changing password:", e);
      toast.error("Erro ao alterar senha");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Senha atual</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowCurrent((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nova senha</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNew((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {newPassword.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all", strengthColor)}
                  style={{ width: `${(passedCount / rules.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-16 text-right">{strengthLabel}</span>
            </div>
            <ul className="space-y-1">
              {ruleResults.map((r) => (
                <li
                  key={r.label}
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    r.ok ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {r.ok ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          type={showNew ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="text-xs text-destructive">As senhas não coincidem</p>
        )}
        {sameAsCurrent && (
          <p className="text-xs text-destructive">A nova senha deve ser diferente da atual</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Alterar senha
        </Button>
      </div>
    </div>
  );
}