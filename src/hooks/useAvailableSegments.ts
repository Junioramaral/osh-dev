import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const OTIMIZZO_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const ALL_SEGMENTS = ["DB", "APP"] as const;
export type SegmentCode = (typeof ALL_SEGMENTS)[number];

/**
 * Returns which segments should be selectable for the current context.
 * - Client users: limited to their own client's contracted segments.
 * - Internal users (Otimizzo/admin/analyst): if a clientId is provided
 *   (not "all"/null), limited to that client's segments; otherwise all.
 */
export function useAvailableSegments(clientId?: string | null) {
  const { profile, isSuperAdmin, isOtimizzoUser } = useAuth();

  const isClientUser =
    !!profile?.client_id &&
    profile.client_id !== OTIMIZZO_TENANT_ID &&
    !isSuperAdmin &&
    !isOtimizzoUser;

  const effectiveClientId = isClientUser
    ? profile?.client_id ?? null
    : clientId && clientId !== "all"
      ? clientId
      : null;

  const query = useQuery({
    queryKey: ["available-segments", effectiveClientId],
    enabled: !!effectiveClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("segments")
        .eq("id", effectiveClientId!)
        .maybeSingle();
      if (error) throw error;
      const raw = ((data as any)?.segments as string[] | null) ?? [];
      const filtered = raw.filter((s): s is SegmentCode =>
        (ALL_SEGMENTS as readonly string[]).includes(s)
      );
      return filtered.length ? filtered : [...ALL_SEGMENTS];
    },
  });

  const segments: SegmentCode[] = effectiveClientId
    ? (query.data ?? [...ALL_SEGMENTS])
    : [...ALL_SEGMENTS];

  return {
    segments,
    isLoading: query.isLoading,
    isClientUser,
  };
}