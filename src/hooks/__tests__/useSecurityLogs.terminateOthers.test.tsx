import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const chain: Record<string, any> = {};
['select', 'eq', 'neq', 'order', 'limit', 'lt', 'gt', 'in', 'maybeSingle', 'single', 'insert', 'update', 'delete'].forEach(
  (method) => {
    chain[method] = vi.fn(() => chain);
  }
);
chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
  Promise.resolve({ data: [], error: null }).then(resolve, reject);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { signOut: vi.fn(() => Promise.resolve({ error: null })) },
    from: vi.fn(() => chain),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
  },
}));

vi.mock('@/features/auth', () => ({ useAuth: () => ({ user: { id: 'user-1' }, isAdmin: false }) }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), setTenantId: vi.fn() } }));

import { supabase } from '@/integrations/supabase/client';
import { useSecurityLogs } from '../useSecurityLogs';
import { ACTIVE_SESSION_STORAGE_KEY } from '@/features/auth/hooks/useAuth';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(chain.neq).mockClear();
  vi.mocked(chain.eq).mockClear();
  vi.mocked(supabase.auth.signOut).mockClear();
});

describe('terminateOtherSessions (QA 037)', () => {
  it('revoga as outras sessoes no GoTrue e preserva a linha deste dispositivo', async () => {
    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, 'sessao-atual');
    const { result } = renderHook(() => useSecurityLogs(), { wrapper });

    await act(async () => {
      await result.current.terminateOtherSessions.mutateAsync();
    });

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'others' });
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(chain.neq).toHaveBeenCalledWith('id', 'sessao-atual');
  });

  it('apaga todas as linhas do usuario quando este navegador nao tem registro', async () => {
    const { result } = renderHook(() => useSecurityLogs(), { wrapper });

    await act(async () => {
      await result.current.terminateOtherSessions.mutateAsync();
    });

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'others' });
    expect(chain.neq).not.toHaveBeenCalled();
  });
});
