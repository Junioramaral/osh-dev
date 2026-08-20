export type TenantRole = "tenant_admin" | "analyst_db" | "analyst_app";

export interface DeriveTenantFlagsInput {
  tenantRole: TenantRole | null;
}

export interface DerivedTenantFlags {
  isTenantStaff: boolean;
  isTenantAdmin: boolean;
  isAnalyst: boolean;
}

export function deriveTenantFlags({ tenantRole }: DeriveTenantFlagsInput): DerivedTenantFlags {
  return {
    isTenantStaff: !!tenantRole,
    isTenantAdmin: tenantRole === "tenant_admin",
    isAnalyst: tenantRole === "analyst_db" || tenantRole === "analyst_app",
  };
}
