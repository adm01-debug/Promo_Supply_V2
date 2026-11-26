import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

interface LockoutStatus {
  locked: boolean;
  remainingSeconds: number;
  lockedUntil?: string;
}

interface LockoutResult {
  locked: boolean;
  lockoutMinutes?: number;
  lockedUntil?: string;
  lockoutCount?: number;
  attempts?: number;
  remainingAttempts?: number;
}

// `account_lockouts.email` e' gravado normalizado por trigger (lower+btrim) e as
// RPCs de lockout comparam igualdade exata: sem normalizar aqui, e-mail digitado
// com maiuscula ou espaco nao encontra o registro e o bloqueio nao vale nada.
const normalizarEmail = (email: string) => email.trim().toLowerCase();

export const useAccountLockout = () => {
  const [lockoutStatus, setLockoutStatus] = useState<LockoutStatus>({
    locked: false,
    remainingSeconds: 0,
  });
  const [countdown, setCountdown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setLockoutStatus({ locked: false, remainingSeconds: 0 });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const checkLockout = useCallback(async (email: string): Promise<LockoutStatus> => {
    try {
      const { data, error } = await supabase.rpc('is_account_locked', {
        _email: normalizarEmail(email),
      });

      if (error) {
        logger.error('Error checking lockout:', { error: error });
        return { locked: true, remainingSeconds: 30 };
      }

      const result = data as { locked: boolean; remaining_seconds: number; locked_until?: string };
      const status: LockoutStatus = {
        locked: result.locked,
        remainingSeconds: result.remaining_seconds,
        lockedUntil: result.locked_until,
      };

      setLockoutStatus(status);
      if (status.locked) {
        setCountdown(status.remainingSeconds);
      }

      return status;
    } catch (error) {
      logger.error('Error checking lockout:', { error: error });
      return { locked: true, remainingSeconds: 30 };
    }
  }, []);

  const recordFailedAttempt = useCallback(async (email: string): Promise<LockoutResult> => {
    try {
      const { data, error } = await supabase.rpc('record_failed_login', {
        _email: normalizarEmail(email),
      });

      if (error) {
        logger.error('Error recording failed attempt:', { error: error });
        return { locked: false };
      }

      const result = data as {
        locked: boolean;
        lockout_minutes?: number;
        locked_until?: string;
        lockout_count?: number;
        attempts?: number;
        remaining_attempts?: number;
      };

      if (result.locked && result.lockout_minutes) {
        const remainingSeconds = result.lockout_minutes * 60;
        setLockoutStatus({
          locked: true,
          remainingSeconds,
          lockedUntil: result.locked_until,
        });
        setCountdown(remainingSeconds);
      }

      return {
        locked: result.locked,
        lockoutMinutes: result.lockout_minutes,
        lockedUntil: result.locked_until,
        lockoutCount: result.lockout_count,
        attempts: result.attempts,
        remainingAttempts: result.remaining_attempts,
      };
    } catch (error) {
      logger.error('Error recording failed attempt:', { error: error });
      return { locked: false };
    }
  }, []);

  const clearLockout = useCallback(async (email: string): Promise<void> => {
    try {
      // A RPC so aceita limpar o e-mail da propria sessao (etapa 057): usa o
      // e-mail da sessao autenticada, nao o que ficou no formulario.
      const { data } = await supabase.auth.getSession();
      const alvo = normalizarEmail(data.session?.user?.email ?? email);
      const { error } = await supabase.rpc('clear_login_lockout', { _email: alvo });

      if (error) {
        logger.error('Error clearing lockout:', { error: error, email: alvo });
        return;
      }

      setLockoutStatus({ locked: false, remainingSeconds: 0 });
      setCountdown(0);
    } catch (error) {
      logger.error('Error clearing lockout:', { error: error });
    }
  }, []);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    lockoutStatus,
    countdown,
    formatCountdown,
    checkLockout,
    recordFailedAttempt,
    clearLockout,
    isLocked: lockoutStatus.locked,
  };
};
