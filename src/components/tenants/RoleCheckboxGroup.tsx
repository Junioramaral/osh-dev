import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const ALL_ROLES = [
  { value: "user", label: "Usuário", description: "Acesso básico para abrir e acompanhar tickets" },
  { value: "analyst_db", label: "Analista DB", description: "Atende tickets de banco de dados" },
  { value: "analyst_app", label: "Analista APP", description: "Atende tickets de aplicação" },
  { value: "tenant_admin", label: "Tenant Admin", description: "Administrador do tenant" },
  { value: "super_admin", label: "Super Admin", description: "Acesso total ao sistema" },
];

interface RoleCheckboxGroupProps {
  selectedRoles: string[];
  onRolesChange: (roles: string[]) => void;
  disabled?: boolean;
  disabledRoles?: string[];
}

export function RoleCheckboxGroup({ selectedRoles, onRolesChange, disabled, disabledRoles = [] }: RoleCheckboxGroupProps) {
  const handleRoleToggle = (roleValue: string, checked: boolean) => {
    if (checked) {
      onRolesChange([...selectedRoles, roleValue]);
    } else {
      const newRoles = selectedRoles.filter(r => r !== roleValue);
      // Ensure at least one role is selected
      if (newRoles.length === 0) {
        newRoles.push("user");
      }
      onRolesChange(newRoles);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Funções</Label>
      <div className="grid grid-cols-1 gap-2 border rounded-md p-3">
        {ALL_ROLES.map((role) => {
          const isRoleDisabled = disabled || disabledRoles.includes(role.value);
          return (
            <div key={role.value} className="flex items-start gap-3">
              <Checkbox
                id={`role-${role.value}`}
                checked={selectedRoles.includes(role.value)}
                onCheckedChange={(checked) => handleRoleToggle(role.value, !!checked)}
                disabled={isRoleDisabled}
              />
              <div className={`grid gap-0.5 leading-none ${isRoleDisabled && disabledRoles.includes(role.value) ? "opacity-60" : ""}`}>
                <Label
                  htmlFor={`role-${role.value}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {role.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {role.description}
                </p>
                {isRoleDisabled && disabledRoles.includes(role.value) && (
                  <p className="text-xs text-blue-500 mt-0.5">Protegido contra auto-remoção</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selectedRoles.length === 0 && (
        <p className="text-xs text-destructive">Selecione pelo menos uma função</p>
      )}
    </div>
  );
}

export function getRolesLabel(roles: string[]): string {
  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    tenant_admin: "Tenant Admin",
    analyst_db: "Analista DB",
    analyst_app: "Analista APP",
    user: "Usuário",
  };
  
  return roles.map(r => roleLabels[r] || r).join(", ");
}
