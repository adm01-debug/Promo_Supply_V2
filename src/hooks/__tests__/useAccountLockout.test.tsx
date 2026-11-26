import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const rpc = vi.fn();
const getSession = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    auth: { getSession: (...args: unknown[]) => getSession(...args) },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), setTenantId: vi.fn() },
}));

import { useAccountLockout } from '../useAccountLockout';

describe('useAccountLockout — normalizacao do e-mail e limpeza pela sessao', () => {
  beforeEach(() => {
    rpc.mockReset();
    getSession.mockReset();
  });

  it('manda o e-mail normalizado para as RPCs de checagem e de tentativa falha', async () => {
    const { result } = renderHook(() => useAccountLockout());

    rpc.mockResolvedValue({ data: { locked: false, remaining_seconds: 0 }, error: null });
    await act(async () => {
      await result.current.checkLockout('  Fulano@Exemplo.COM ');
    });
    expect(rpc).toHaveBeenCalledWith('is_account_locked', { _email: 'fulano@exemplo.com' });

    rpc.mockResolvedValue({ data: { locked: false, attempts: 1, remaining_attempts: 4 }, error: null });
    await act(async () => {
      await result.current.recordFailedAttempt('Fulano@Exemplo.COM');
    });
    expect(rpc).toHaveBeenCalledWith('record_failed_login', { _email: 'fulano@exemplo.com' });
  });

  it('limpa o bloqueio do e-mail da sessao autenticada, e nao o do formulario', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { email: 'Dono@Empresa.com' } } }, error: null });
    rpc.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAccountLockout());
    await act(async () => {
      await result.current.clearLockout('outro@qualquer.com');
    });

    expect(rpc).toHaveBeenCalledWith('clear_login_lockout', { _email: 'dono@empresa.com' });
  });

  it('mantem o estado bloqueado quando o servidor recusa a limpeza', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { email: 'dono@empresa.com' } } }, error: null });
    rpc.mockResolvedValue({ data: { locked: true, remaining_seconds: 120 }, error: null });

    const { result } = renderHook(() => useAccountLockout());
    await act(async () => {
      await result.current.checkLockout('dono@empresa.com');
    });
    expect(result.current.lockoutStatus.locked).toBe(true);

    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'sem permissao' } });
    await act(async () => {
      await result.current.clearLockout('dono@empresa.com');
    });
    expect(result.current.lockoutStatus.locked).toBe(true);
  });
});