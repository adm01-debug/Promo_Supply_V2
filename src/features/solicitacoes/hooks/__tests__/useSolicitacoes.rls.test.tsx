/**
 * Regressão (migration 20261113123738): comprador não altera/exclui solicitação de outro.
 * O RLS do Postgres filtra a linha em silêncio — o PostgREST devolve 0 linhas e nenhum erro.
 * Antes o hook mostrava "Solicitação atualizada!" mesmo sem gravar nada; agora tem de falhar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const { result: dbResult, toastMock } = vi.hoisted(() => ({
  result: { data: [] as { id: string }[] | null, error: null as { message: string } | null },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'buyer-a', email: 'a@x.com' }, organizationId: 'org-1' }),
}));
vi.mock('@/hooks/useApprovalWorkflow', () => ({ useApprovalWorkflow: () => ({ createWorkflow: vi.fn() }) }));
vi.mock('@/lib/feedbackToast', () => ({ toast: toastMock }));
vi.mock('@/lib/paginatedFetch', () => ({ fetchAllRows: vi.fn(async () => []) }));

vi.mock('@/integrations/supabase/client', () => {
  const chain: Record<string, unknown> = {};
  for (const m of ['update', 'delete', 'eq', 'in', 'order', 'range']) chain[m] = vi.fn(() => chain);
  chain.select = vi.fn(() => Promise.resolve(dbResult));
  return { supabase: { from: vi.fn(() => chain), rpc: vi.fn(async () => ({ data: null, error: null })) } };
});

import { useSolicitacoes } from '../useSolicitacoes';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useSolicitacoes — escrita negada pelo RLS', () => {
  beforeEach(() => {
    toastMock.success.mockClear();
    toastMock.error.mockClear();
  });

  it('updateSolicitacao com 0 linhas afetadas retorna false e mostra erro', async () => {
    dbResult.data = [];
    const { result } = renderHook(() => useSolicitacoes(), { wrapper });
    let ok = true;
    await act(async () => { ok = await result.current.updateSolicitacao('sol-de-outro', { titulo: 'x' }); });
    expect(ok).toBe(false);
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining('sem permissão'));
  });

  it('bulkUpdateStatus e bulkDelete com 0 linhas afetadas retornam false', async () => {
    dbResult.data = [];
    const { result } = renderHook(() => useSolicitacoes(), { wrapper });
    let upd = true;
    let del = true;
    await act(async () => { upd = await result.current.bulkUpdateStatus(['a', 'b'], 'aprovada'); });
    await act(async () => { del = await result.current.bulkDelete(['a', 'b']); });
    expect(upd).toBe(false);
    expect(del).toBe(false);
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('updateSolicitacao com linha afetada continua retornando true', async () => {
    dbResult.data = [{ id: 'minha' }];
    const { result } = renderHook(() => useSolicitacoes(), { wrapper });
    let ok = false;
    await act(async () => { ok = await result.current.updateSolicitacao('minha', { titulo: 'x' }); });
    expect(ok).toBe(true);
    expect(toastMock.success).toHaveBeenCalledWith('Solicitação atualizada!');
  });
});
