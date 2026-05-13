import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type AppRole = 'admin' | 'coordinator' | 'buyer' | 'finance' | 'viewer';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  department: string | null;
  phone: string | null;
  current_organization_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: AppRole | null;
  organizationId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (requiredRole: AppRole | AppRole[]) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedUserIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchUserData = useCallback(async (userId: string) => {
    // Deduplicate: skip if already fetched for this user or currently fetching
    if (fetchedUserIdRef.current === userId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    logger.debug('Fetching auth user data', { userId });

    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      ]);

      if (profileRes.error) {
        logger.error('Error fetching profile', { error: profileRes.error, userId });
      }
      if (roleRes.error) {
        logger.error('Error fetching role', { error: roleRes.error, userId });
      }

      setProfile(profileRes.data ? (profileRes.data as UserProfile) : null);
      setRole(roleRes.data?.role ? (roleRes.data.role as AppRole) : null);
      setOrganizationId(profileRes.data?.current_organization_id || null);
      fetchedUserIdRef.current = userId;
      logger.info('Auth user data loaded successfully', { userId, role: roleRes.data?.role });
    } catch (error) {
      logger.error('Error fetching user data', { error, userId });
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Check existing session first
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserData(session.user.id);
      }

      if (mounted) setLoading(false);
    }).catch((error: unknown) => {
      logger.error('Error getting initial session', { error });
      if (mounted) setLoading(false);
    });

    // Then listen for changes — CRITICAL: never await inside onAuthStateChange
    // to prevent deadlocks that block subsequent auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fire-and-forget via setTimeout to avoid blocking the auth event loop
          if (event === 'SIGNED_IN') {
            setLoading(true);
            setTimeout(() => {
              if (!mounted) return;
              fetchUserData(session.user.id).finally(() => {
                if (mounted) setLoading(false);
              });
            }, 0);
          }

          if (event === 'TOKEN_REFRESHED') {
            setTimeout(() => {
              if (mounted) void fetchUserData(session.user.id);
            }, 0);
          }
        } else {
          setProfile(null);
          setRole(null);
          setOrganizationId(null);
          fetchedUserIdRef.current = null;
        }

        if (event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) logger.warn('Sign in failed', { email: normalizedEmail, error: error.message });
    else logger.info('Sign in successful', { email: normalizedEmail });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    const userId = user?.id;
    logger.info('Signing out', { userId });
    fetchedUserIdRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setOrganizationId(null);
  };

  const hasRole = (requiredRole: AppRole | AppRole[]): boolean => {
    if (!role) return false;
    
    // Admin has access to everything
    if (role === 'admin') return true;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role);
    }
    
    return role === requiredRole;
  };

  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        organizationId,
        loading,
        signIn,
        signUp,
        signOut,
        hasRole,
        isAdmin,
      }}
    >
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

// Role labels in Portuguese
export const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  coordinator: 'Coordenador',
  buyer: 'Comprador',
  finance: 'Financeiro',
  viewer: 'Visualizador',
};

// Role colors
export const roleColors: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  coordinator: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  buyer: 'bg-primary/10 text-primary border-primary/20',
  finance: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  viewer: 'bg-muted text-muted-foreground border-border',
};
