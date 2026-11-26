import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/feedbackToast';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
const THROTTLE_MS = 60_000; // Only update "last activity" once per minute

/**
 * Hook that auto-logs out the user after a period of inactivity.
 * Tracks mouse, keyboard, touch and scroll events.
 *
 * Fix #3: Uses signOut from AuthContext so the app's full cleanup runs
 * (queryClient.clear + state reset), instead of calling supabase directly
 * which would leave caches and React state desynchronized.
 */
export function useSessionIdleTimeout(timeoutMs = IDLE_TIMEOUT_MS) {
  const { signOut } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    toast.warning('Sessão expirada por inatividade. Faça login novamente.', {
      duration: 5000,
    });
    try {
      await signOut();
    } catch (error: unknown) {
      // Best-effort: ignore so the timer never throws unhandled
    }
  }, [signOut]);

  const resetTimer = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < THROTTLE_MS) return;
    lastActivityRef.current = now;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, timeoutMs);
  }, [handleLogout, timeoutMs]);

  useEffect(() => {
    timerRef.current = setTimeout(handleLogout, timeoutMs);

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [resetTimer, handleLogout, timeoutMs]);
}
