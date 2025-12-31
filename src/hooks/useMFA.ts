import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface MFASettings {
  id: string;
  user_id: string;
  mfa_enabled: boolean;
  mfa_method: string;
  backup_codes: string[] | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useMFA = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [verifying, setVerifying] = useState(false);

  // Fetch MFA settings
  const { data: mfaSettings, isLoading } = useQuery({
    queryKey: ['mfa-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('mfa_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as MFASettings | null;
    },
    enabled: !!user,
  });

  // Enroll in MFA
  const enrollMFA = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Use Supabase Auth MFA enrollment
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-settings'] });
    },
    onError: (error) => {
      toast.error('Erro ao configurar MFA: ' + error.message);
    },
  });

  // Verify MFA code during enrollment
  const verifyEnrollment = useMutation({
    mutationFn: async ({ factorId, code }: { factorId: string; code: string }) => {
      setVerifying(true);
      
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (error) throw error;

      // Update local MFA settings
      if (user) {
        await supabase.from('mfa_settings').upsert({
          user_id: user.id,
          mfa_enabled: true,
          mfa_method: 'totp',
          last_verified_at: new Date().toISOString(),
        });
      }

      return data;
    },
    onSuccess: () => {
      setVerifying(false);
      queryClient.invalidateQueries({ queryKey: ['mfa-settings'] });
      toast.success('MFA configurado com sucesso!');
    },
    onError: (error) => {
      setVerifying(false);
      toast.error('Código inválido: ' + error.message);
    },
  });

  // Verify MFA code during login
  const verifyMFA = useMutation({
    mutationFn: async (code: string) => {
      setVerifying(true);

      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factors.totp[0];
      if (!totpFactor) throw new Error('No TOTP factor found');

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) throw challengeError;

      const { data, error } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      });

      if (error) throw error;

      // Update last verified
      if (user) {
        await supabase.from('mfa_settings').update({
          last_verified_at: new Date().toISOString(),
        }).eq('user_id', user.id);
      }

      return data;
    },
    onSuccess: () => {
      setVerifying(false);
      toast.success('Verificação bem-sucedida!');
    },
    onError: (error) => {
      setVerifying(false);
      toast.error('Código inválido: ' + error.message);
    },
  });

  // Disable MFA
  const disableMFA = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Get factors and unenroll
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      for (const factor of factors.totp) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      // Update local settings
      await supabase.from('mfa_settings').update({
        mfa_enabled: false,
        backup_codes: null,
      }).eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-settings'] });
      toast.success('MFA desativado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao desativar MFA: ' + error.message);
    },
  });

  // Generate backup codes
  const generateBackupCodes = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Generate 10 random backup codes
      const codes = Array.from({ length: 10 }, () =>
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );

      await supabase.from('mfa_settings').update({
        backup_codes: codes,
      }).eq('user_id', user.id);

      return codes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-settings'] });
      toast.success('Códigos de backup gerados');
    },
    onError: (error) => {
      toast.error('Erro ao gerar códigos: ' + error.message);
    },
  });

  // Check if MFA is required for this session
  const checkMFARequired = async (): Promise<boolean> => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) return false;
    
    return data.currentLevel !== data.nextLevel;
  };

  return {
    mfaSettings,
    isLoading,
    verifying,
    isMFAEnabled: mfaSettings?.mfa_enabled ?? false,
    enrollMFA,
    verifyEnrollment,
    verifyMFA,
    disableMFA,
    generateBackupCodes,
    checkMFARequired,
  };
};
