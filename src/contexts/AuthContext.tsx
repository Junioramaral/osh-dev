import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  full_name: string;
  client_id: string | null;
  team_id: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export type UserRoleType = 'super_admin' | 'tenant_admin' | 'analyst_db' | 'analyst_app' | 'user';

interface UserRole {
  role: UserRoleType;
  tenant_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  loading: boolean;
  mustChangePassword: boolean;
  hasRole: (role: string) => boolean;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  isViewer: boolean;
  isAnalyst: boolean;
  isOtimizzoUser: boolean;
  tenantId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, full_name: string, tenant_id: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  clearMustChangePassword: () => void;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const navigate = useNavigate();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log('[AuthContext] Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[AuthContext] Error fetching profile:', error);
        return;
      }
      
      console.log('[AuthContext] Profile loaded:', data);
      setProfile(data as Profile);
    } catch (err) {
      console.error('[AuthContext] Exception fetching profile:', err);
    }
  }, []);

  const fetchRoles = useCallback(async (userId: string) => {
    try {
      console.log('[AuthContext] Fetching roles for user:', userId);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, tenant_id')
        .eq('user_id', userId);
      
      if (error) {
        console.error('[AuthContext] Error fetching roles:', error);
        return;
      }
      
      console.log('[AuthContext] Roles loaded:', data);
      setRoles(data as UserRole[]);
    } catch (err) {
      console.error('[AuthContext] Exception fetching roles:', err);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth event:', event);
        
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          console.log('[AuthContext] Session ended, clearing state');
          setUser(null);
          setSession(null);
          setProfile(null);
          setRoles([]);
          setMustChangePassword(false);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const mustChange = session.user.user_metadata?.must_change_password === true;
          setMustChangePassword(mustChange);
          
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRoles(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setMustChangePassword(false);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRoles]);

  const hasRole = useCallback((role: string) => roles.some(r => r.role === role), [roles]);
  
  const isSuperAdmin = useMemo(() => roles.some(r => r.role === 'super_admin'), [roles]);
  const isTenantAdmin = useMemo(() => roles.some(r => r.role === 'tenant_admin'), [roles]);
  const isViewer = useMemo(() => roles.some(r => (r.role as string) === 'viewer'), [roles]);
  const isAnalyst = useMemo(() => roles.some(r => r.role === 'analyst_db' || r.role === 'analyst_app'), [roles]);
  const isOtimizzoUser = useMemo(() => roles.some(r => r.tenant_id === '00000000-0000-0000-0000-000000000001'), [roles]);
  const tenantId = useMemo(() => roles.find(r => r.tenant_id)?.tenant_id || null, [roles]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data?.user) {
      const mustChange = data.user.user_metadata?.must_change_password === true;
      console.log('[AuthContext] Login successful, must_change_password:', mustChange);
      setMustChangePassword(mustChange);
      
      if (!mustChange) {
        navigate('/dashboard');
      }
    }
    
    return { error };
  }, [navigate]);

  const signUp = useCallback(async (email: string, password: string, full_name: string, tenant_id: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name,
          tenant_id,
        }
      }
    });
    
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setMustChangePassword(false);
    navigate('/auth');
  }, [navigate]);

  const clearMustChangePassword = useCallback(() => {
    setMustChangePassword(false);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    roles,
    loading,
    mustChangePassword,
    hasRole,
    isSuperAdmin,
    isTenantAdmin,
    isViewer,
    isAnalyst,
    isOtimizzoUser,
    tenantId,
    signIn,
    signUp,
    signOut,
    clearMustChangePassword,
    resetPassword,
    updatePassword,
  }), [
    user, session, profile, roles, loading, mustChangePassword,
    hasRole, isSuperAdmin, isTenantAdmin, isViewer, isAnalyst, isOtimizzoUser, tenantId,
    signIn, signUp, signOut, clearMustChangePassword, resetPassword, updatePassword,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return {
      user: null,
      session: null,
      profile: null,
      roles: [],
      loading: true,
      mustChangePassword: false,
      hasRole: () => false,
      isSuperAdmin: false,
      isTenantAdmin: false,
      isViewer: false,
      isAnalyst: false,
      isOtimizzoUser: false,
      tenantId: null,
      signIn: async () => ({ error: new Error('Not initialized') }),
      signUp: async () => ({ error: new Error('Not initialized') }),
      signOut: async () => {},
      clearMustChangePassword: () => {},
      resetPassword: async () => ({ error: new Error('Not initialized') }),
      updatePassword: async () => ({ error: new Error('Not initialized') }),
    } as AuthContextType;
  }
  return context;
};
