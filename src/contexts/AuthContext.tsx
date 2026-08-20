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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  mustChangePassword: boolean;
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth event:', event);

        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          console.log('[AuthContext] Session ended, clearing state');
          setUser(null);
          setSession(null);
          setProfile(null);
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
          }, 0);
        } else {
          setProfile(null);
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
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

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
    loading,
    mustChangePassword,
    signIn,
    signUp,
    signOut,
    clearMustChangePassword,
    resetPassword,
    updatePassword,
  }), [
    user, session, profile, loading, mustChangePassword,
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
      loading: true,
      mustChangePassword: false,
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
