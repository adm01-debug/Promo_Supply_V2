import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SecurityLog {
  id: string;
  user_id: string | null;
  event_type: string;
  event_description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  severity: string;
  created_at: string;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  failure_reason: string | null;
  created_at: string;
}

export interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  blocked_by: string | null;
  blocked_at: string;
  expires_at: string | null;
  permanent: boolean;
  attempts_count: number;
}

export interface IPWhitelist {
  id: string;
  ip_address: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RateLimitLog {
  id: string;
  ip_address: string;
  endpoint: string;
  request_count: number;
  window_start: string;
  blocked: boolean;
  user_id: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ActiveSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: Record<string, unknown> | null;
  last_activity: string;
  expires_at: string;
  created_at: string;
}

export const useSecurityLogs = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Fetch security logs (admin only)
  const { data: securityLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['security-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as SecurityLog[];
    },
    enabled: !!user && isAdmin,
  });

  // Fetch login attempts (admin only)
  const { data: loginAttempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['login-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as LoginAttempt[];
    },
    enabled: !!user && isAdmin,
  });

  // Fetch blocked IPs (admin only)
  const { data: blockedIPs, isLoading: blockedLoading } = useQuery({
    queryKey: ['blocked-ips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .order('blocked_at', { ascending: false });

      if (error) throw error;
      return data as BlockedIP[];
    },
    enabled: !!user && isAdmin,
  });

  // Fetch IP whitelist (admin only)
  const { data: ipWhitelist, isLoading: whitelistLoading } = useQuery({
    queryKey: ['ip-whitelist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_whitelist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as IPWhitelist[];
    },
    enabled: !!user && isAdmin,
  });

  // Fetch rate limit logs (admin only)
  const { data: rateLimitLogs, isLoading: rateLoading } = useQuery({
    queryKey: ['rate-limit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rate_limit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as RateLimitLog[];
    },
    enabled: !!user && isAdmin,
  });

  // Fetch active sessions
  const { data: activeSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['active-sessions', user?.id],
    queryFn: async () => {
      const query = isAdmin
        ? supabase.from('active_sessions').select('*')
        : supabase.from('active_sessions').select('*').eq('user_id', user?.id);
      
      const { data, error } = await query.order('last_activity', { ascending: false });
      
      if (error) throw error;
      return data as ActiveSession[];
    },
    enabled: !!user,
  });

  // Block IP
  const blockIP = useMutation({
    mutationFn: async (data: { ip_address: string; reason: string; permanent?: boolean; expires_at?: string }) => {
      const { error } = await supabase.from('blocked_ips').insert({
        ip_address: data.ip_address,
        reason: data.reason,
        permanent: data.permanent ?? false,
        expires_at: data.expires_at ?? null,
        blocked_by: user?.id,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
    },
  });

  // Unblock IP
  const unblockIP = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocked_ips').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
    },
  });

  // Add to whitelist
  const addToWhitelist = useMutation({
    mutationFn: async (data: { ip_address: string; description?: string }) => {
      const { error } = await supabase.from('ip_whitelist').insert({
        ip_address: data.ip_address,
        description: data.description ?? null,
        created_by: user?.id,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] });
    },
  });

  // Remove from whitelist
  const removeFromWhitelist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ip_whitelist').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] });
    },
  });

  // Terminate session
  const terminateSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from('active_sessions').delete().eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
  });

  // Get stats
  const getStats = () => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const failedLogins24h = loginAttempts?.filter(
      a => !a.success && new Date(a.created_at) > last24h
    ).length ?? 0;

    const blockedIPsActive = blockedIPs?.filter(
      ip => ip.permanent || (ip.expires_at && new Date(ip.expires_at) > now)
    ).length ?? 0;

    const criticalEvents = securityLogs?.filter(
      l => l.severity === 'critical' && new Date(l.created_at) > lastWeek
    ).length ?? 0;

    const activeSessionsCount = activeSessions?.length ?? 0;

    return {
      failedLogins24h,
      blockedIPsActive,
      criticalEvents,
      activeSessionsCount,
    };
  };

  return {
    securityLogs,
    loginAttempts,
    blockedIPs,
    ipWhitelist,
    rateLimitLogs,
    activeSessions,
    isLoading: logsLoading || attemptsLoading || blockedLoading || whitelistLoading || rateLoading || sessionsLoading,
    blockIP,
    unblockIP,
    addToWhitelist,
    removeFromWhitelist,
    terminateSession,
    getStats,
  };
};
