import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const h = vi.hoisted(() => {
  const chain: Record<string, unknown> = {};
  const estado = { deletando: false };
  const resultado = { data: [] as { id: string }[] | null, error: null as { message: string } | null };
  return {
    chain,
    estado,
    resultado,
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  };
});

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, organizationId: 'org-1' }),
}));
vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: vi.fn() }));
vi.mock('@/lib/feedbackToast', () => ({ toast: h.toast }));

vi.mock('@/integrations/supabase/client', () => {
  const chain = h.chain;
  const estado = h.estado;
  const resultado = h.resultado;
  chain['delete'] = vi.fn(() => { estado.deletando = true; return chain; });
  for (const metodo of ['eq', 'in', 'order', 'range', 'or', 'gte', 'lte', 'limit']) {
    chain[metodo] = vi.fn(() => chain);
  }
  chain['select'] = vi.fn(() => (estado.deletando ? Promise.resolve(resultado) : chain));
  return {
    supabase: {
      from: vi.fn(() => { estado.deletando = false; return chain; }),
      rpc: vi.fn(async () => ({ data: null, error: null })),
    },
  };
});

import { usePedidos } from '../usePedidos';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('usePedidos - exclusao so em pedido pendente ou cancelado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.resultado.error = null;
    h.resultado.data = [];
  });

  it('bulkDelete manda o filtro de status junto com os ids', async () => {
    h.resultado.data = [{ id: 'p1' }];
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = false;
    await act(async () => { ok = await result.current.bulkDelete(['p1']); });

    expect(ok).toBe(true);
    expect(h.chain['in']).toHaveBeenCalledWith('status', ['pendente', 'cancelado']);
    expect(h.toast.success).toHaveBeenCalled();
  });

  it('bulkDelete sem nenhuma linha removida falha e explica o motivo', async () => {
    h.resultado.data = [];
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.bulkDelete(['p1', 'p2']); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('pendentes ou cancelados'));
  });

  it('bulkDelete parcial avisa quantos ficaram de fora e nao comemora', async () => {
    h.resultado.data = [{ id: 'p1' }];
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.bulkDelete(['p1', 'p2']); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.warning).toHaveBeenCalledWith(expect.stringContaining('1 de 2'));
  });

  it('deletePedido bloqueado pelo status nao comemora', async () => {
    h.resultado.data = [];
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.deletePedido('p1'); });

    expect(ok).toBe(false);
    expect(h.chain['in']).toHaveBeenCalledWith('status', ['pendente', 'cancelado']);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('pendentes ou cancelados'));
  });

  it('deletePedido de pedido descartavel continua funcionando', async () => {
    h.resultado.data = [{ id: 'p1' }];
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = false;
    await act(async () => { ok = await result.current.deletePedido('p1'); });

    expect(ok).toBe(true);
    expect(h.toast.success).toHaveBeenCalled();
  });
});
