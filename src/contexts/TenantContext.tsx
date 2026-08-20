import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { deriveTenantFlags, type TenantRole } from "@/lib/deriveTenantFlags";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_platform_owner: boolean;
  is_active: boolean;
  created_at: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  clientId: string | null;
  tenantRole: TenantRole | null;
  isPlatformAdmin: boolean;
  isTenantStaff: boolean;
  isTenantAdmin: boolean;
  isAnalyst: boolean;
  hasTenantRole: (role: TenantRole) => boolean;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantRole, setTenantRole] = useState<TenantRole | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTenantState = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const [{ data: adminRow }, { data: tenantUserRow }, { data: clientUserRow }] = await Promise.all([
        supabase.from("platform_admins").select("id").eq("user_id", userId).maybeSingle(),
        supabase.from("tenant_users").select("tenant_id, role").eq("user_id", userId).maybeSingle(),
        supabase.from("client_users").select("client_id").eq("user_id", userId).maybeSingle(),
      ]);

      const tenantRow = tenantUserRow?.tenant_id
        ? (
            await supabase
              .from("tenants")
              .select("id, name, slug, is_platform_owner, is_active, created_at")
              .eq("id", tenantUserRow.tenant_id)
              .maybeSingle()
          ).data ?? null
        : null;

      setIsPlatformAdmin(!!adminRow);
      setTenantRole((tenantUserRow?.role as TenantRole) ?? null);
      setClientId(clientUserRow?.client_id ?? null);
      setTenant(tenantRow);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user?.id) {
      fetchTenantState(user.id);
    } else {
      setTenant(null);
      setTenantRole(null);
      setClientId(null);
      setIsPlatformAdmin(false);
      setIsLoading(false);
    }
  }, [user?.id, authLoading, fetchTenantState]);

  const value = useMemo(() => {
    const { isTenantStaff, isTenantAdmin, isAnalyst } = deriveTenantFlags({ tenantRole });
    return {
      tenant,
      tenantId: tenant?.id ?? null,
      clientId,
      tenantRole,
      isPlatformAdmin,
      isTenantStaff,
      isTenantAdmin,
      isAnalyst,
      hasTenantRole: (role: TenantRole) => tenantRole === role,
      isLoading,
    };
  }, [tenant, tenantRole, clientId, isPlatformAdmin, isLoading]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
};
