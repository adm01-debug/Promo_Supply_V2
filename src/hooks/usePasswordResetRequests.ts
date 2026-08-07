import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';

export interface PasswordResetRequest {
  id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'expired';
  reason: string | null;
  admin_notes: string | null;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  completed_at: string | null;
  expires_at: string;
  reset_token: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export const usePasswordResetRequests = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all pending requests (for admins)
  const { data: pendingRequests, isLoading: pendingLoading } = useQuery({
    queryKey: ['password-reset-requests', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      return data as PasswordResetRequest[];
    },
    enabled: !!user && isAdmin,
  });

  // Fetch all requests (for admins)
  const { data: allRequests, isLoading: allLoading } = useQuery({
    queryKey: ['password-reset-requests', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as PasswordResetRequest[];
    },
    enabled: !!user && isAdmin,
  });

  // Fetch user's own requests
  const { data: myRequests, isLoading: myLoading } = useQuery({
    queryKey: ['password-reset-requests', 'my', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select('*')
        .eq('user_id', user?.id ?? '')
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      return data as PasswordResetRequest[];
    },
    enabled: !!user,
  });

  // Create a reset request
  const createRequest = useMutation({
    mutationFn: async ({ reason }: { reason?: string }) => {
      if (!user?.id || !user?.email) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('password_reset_requests')
        .insert({
          user_id: user.id,
          email: user.email,
          reason,
          ip_address: null, // Would need edge function to get real IP
          user_agent: navigator.userAgent,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
    },
  });

  // Approve request (admin only)
  const approveRequest = useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes?: string }) => {
      // Generate a secure token
      const resetToken = crypto.randomUUID();
      
      const { error } = await supabase
        .from('password_reset_requests')
        .update({
          status: 'approved',
          admin_notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          reset_token: resetToken,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now
        })
        .eq('id', id);
      
      if (error) throw error;
      return { resetToken };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
    },
  });

  // Reject request (admin only)
  const rejectRequest = useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes?: string }) => {
      const { error } = await supabase
        .from('password_reset_requests')
        .update({
          status: 'rejected',
          admin_notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
    },
  });

  // Mark as completed
  const completeRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('password_reset_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
    },
  });

  return {
    pendingRequests,
    allRequests,
    myRequests,
    isLoading: pendingLoading || allLoading || myLoading,
    createRequest,
    approveRequest,
    rejectRequest,
    completeRequest,
    pendingCount: pendingRequests?.length ?? 0,
  };
};
