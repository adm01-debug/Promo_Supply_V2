import { useEffect, useState, useRef, useCallback, ReactNode, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/query-client';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import type { AppRole } from '../types/authRoles';
import { UserProfileSchema, type UserProfile, type Tenant } from '../schemas/auth.schemas';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('selectedEmpresaId');
  });
  const [loading, setLoading] = useState(true);
  const fetchedUserIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // CRIT-C1/C8: monotonic generation invalidates in-flight fetches when
  // signOut / SIGNED_OUT / user-switch occurs, preventing stale data from a
  // previous user leaking into the newly-cleared state.
  const fetchGenerationRef = useRef(0);

  const setSelectedEmpresa = useCallback((empresaId: string | null) => {
    setSelectedEmpresaIdState(empresaId);
    if (typeof window !== 'undefined') {
      if (empresaId) window.localStorage.setItem('selectedEmpresaId', empresaId);
      else window.localStorage.removeItem('selectedEmpresaId');
    }
    // Invalida queries para refetch com novo filtro
    queryClient.invalidateQueries();
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    // Deduplicate: skip if already fetched for this user or currently fetching
    if (fetchedUserIdRef.current === userId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    logger.debug('Fetching auth user data', { userId });

    try {
      const [profileRes, roleRes, tenantIdRes, availableTenantsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.rpc('current_tenant_id'), // Renomeado internamente para refletir o que é
        supabase.from('user_tenants').select('tenant:tenants(id, name, slug, cnpj, razao_social, nome_fantasia, uf, regime_tributario, cor_identificacao, empresa_codigo, organization_id)').eq('user_id', userId),
      ]);

      if (profileRes.error) {
        logger.error('Error fetching profile', { error: profileRes.error, userId });
      }
      if (roleRes.error) {
        logger.error('Error fetching role', { error: roleRes.error, userId });
      }
      if (tenantIdRes.error) {
        logger.error('Error fetching current tenant', { error: tenantIdRes.error, userId });
      }

      if (profileRes.data) {
        const validatedProfile = UserProfileSchema.safeParse(profileRes.data);
        if (validatedProfile.success) {
          setProfile(validatedProfile.data);
        } else {
          logger.error('Profile validation failed', { error: validatedProfile.error, data: profileRes.data });
          setProfile(profileRes.data as UserProfile); // Fallback but logged
        }
      } else {
        setProfile(null);
      }
      setRole(roleRes.data?.role ? (roleRes.data.role as AppRole) : null);
      setOrganizationId(profileRes.data?.current_organization_id || tenantIdRes.data || null);
      setTenantId(tenantIdRes.data || null);
      logger.setTenantId(tenantIdRes.data || null);
      
      if (availableTenantsRes.data) {
        const tenants = availableTenantsRes.data
          .map((ut: any) => ut.tenant)
          .filter(Boolean) as Tenant[];
        setAvailableTenants(tenants);
      }

      fetchedUserIdRef.current = userId;
      logger.info('Auth user data loaded successfully', { userId, role: roleRes.data?.role, tenantId: tenantIdRes.data });
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

      if (mounted) {
        // Delay setting loading to false slightly to prevent flicker
        timeoutRef.current = setTimeout(() => {
          if (mounted) setLoading(false);
        }, 100);
      }
    }).catch((error: unknown) => {
      logger.error('Error getting initial session', { error });
      if (mounted) setLoading(false);
    });

    // Fix #2: Synchronous callback — defer async work via setTimeout to avoid
    // deadlocks in Supabase's internal state machine (token refresh / tab switch).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        // Optimistic, synchronous session/user update
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (event === 'SIGNED_IN') setLoading(true);
            setTimeout(() => {
              if (!mounted) return;
              fetchUserData(session.user.id).finally(() => {
                if (mounted) setLoading(false);
              });
            }, 0);
          }
        } else {
          setProfile(null);
          setRole(null);
          setOrganizationId(null);
          setTenantId(null);
          logger.setTenantId(null);
          setAvailableTenants([]);
          fetchedUserIdRef.current = null;
          if (event === 'SIGNED_OUT') {
            // Fix #1/#5: ensure cache is wiped on every sign-out path
            queryClient.clear();
            setLoading(false);
          }
        }
      }
    );

    // Fix #5: Cross-tab logout sync — when Supabase clears its token in another
    // tab, mirror the cleanup here so in-memory state doesn't keep stale data.
    const handleStorageLogout = (e: StorageEvent) => {
      if (!mounted) return;
      if (e.key && e.key.startsWith('sb-') && e.key.endsWith('-auth-token') && e.newValue === null) {
        queryClient.clear();
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setOrganizationId(null);
        setTenantId(null);
        setAvailableTenants([]);
        fetchedUserIdRef.current = null;
      }
    };
    window.addEventListener('storage', handleStorageLogout);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageLogout);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fetchUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) logger.warn('Sign in failed', { email: normalizedEmail, error: error.message });
    else logger.info('Sign in successful', { email: normalizedEmail });
    return { error: error as Error | null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
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
  }, []);

  const signOut = useCallback(async () => {
    const userId = user?.id;
    logger.info('Signing out', { userId });
    fetchedUserIdRef.current = null;
    await supabase.auth.signOut();
    // Fix #1: wipe TanStack Query cache (memory + persisted localStorage) so the
    // next user on this machine never sees the previous user's data.
    queryClient.clear();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setOrganizationId(null);
    setTenantId(null);
    setAvailableTenants([]);
  }, [user?.id]);

  const switchTenant = useCallback(async (newTenantId: string) => {
    if (!user) return;
    try {
      setLoading(true);
      logger.info('Switching tenant', { userId: user.id, newTenantId });
      
      // Update default tenant for user
      const { error } = await supabase
        .from('user_tenants')
        .update({ is_default: false })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      const { error: updateError } = await supabase
        .from('user_tenants')
        .update({ is_default: true })
        .eq('user_id', user.id)
        .eq('tenant_id', newTenantId);
        
      if (updateError) throw updateError;

      // Clear refs to force re-fetch
      fetchedUserIdRef.current = null;
      await fetchUserData(user.id);
      
      toast.success('Organização alterada com sucesso!');
    } catch (error) {
      logger.error('Error switching tenant', { error, newTenantId });
      toast.error('Erro ao alterar organização');
    } finally {
      setLoading(false);
    }
  }, [user, fetchUserData]);

  const hasRole = useCallback((requiredRole: AppRole | AppRole[]): boolean => {
    if (!role) return false;
    
    // Admin has access to everything
    if (role === 'admin') return true;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role);
    }
    
    return role === requiredRole;
  }, [role]);

  const isAdmin = useMemo(() => role === 'admin', [role]);

  const ctxValue = useMemo(
    () => ({
      user,
      session,
      profile,
      role,
      organizationId,
      grupoId: organizationId,
      tenantId,
      selectedEmpresaId,
      availableTenants,
      availableEmpresas: availableTenants,
      loading,
      signIn,
      signUp,
      signOut,
      switchTenant,
      setSelectedEmpresa,
      hasRole,
      isAdmin,
    }),
    [
      user,
      session,
      profile,
      role,
      organizationId,
      tenantId,
      selectedEmpresaId,
      availableTenants,
      loading,
      signIn,
      signUp,
      signOut,
      switchTenant,
      setSelectedEmpresa,
      hasRole,
      isAdmin,
    ]
  );

  return <AuthContext.Provider value={ctxValue}>{children}</AuthContext.Provider>;
};
