import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  full_name: string;
  client_id: string | null;
  team_id: string | null;
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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if user must change password
          const mustChange = session.user.user_metadata?.must_change_password === true;
          setMustChangePassword(mustChange);
          
          // Fetch profile and roles in a deferred manner
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

    // Check for existing session
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
  }, []);

  const fetchProfile = async (userId: string) => {
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
  };

  const fetchRoles = async (userId: string) => {
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
  };

  const hasRole = (role: string) => roles.some(r => r.role === role);
  const isSuperAdmin = hasRole('super_admin');
  const isOtimizzoUser = roles.some(r => r.tenant_id === '00000000-0000-0000-0000-000000000001');
  const tenantId = roles.find(r => r.tenant_id)?.tenant_id || null;

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data?.user) {
      // Verificar ANTES de navegar se precisa trocar senha
      const mustChange = data.user.user_metadata?.must_change_password === true;
      console.log('[AuthContext] Login successful, must_change_password:', mustChange);
      setMustChangePassword(mustChange);
      
      // Só navega se NÃO precisar trocar senha
      if (!mustChange) {
        navigate('/dashboard');
      }
      // Se mustChange = true, permanece em /auth e ForcePasswordChange será exibido
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, full_name: string, tenant_id: string) => {
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
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setMustChangePassword(false);
    navigate('/auth');
  };

  const clearMustChangePassword = () => {
    setMustChangePassword(false);
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      roles,
      loading,
      mustChangePassword,
      hasRole,
      isSuperAdmin,
      isOtimizzoUser,
      tenantId,
      signIn, 
      signUp, 
      signOut,
      clearMustChangePassword,
      resetPassword,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
