/**
 * TST-06 (etapa 281): o caminho de ESCRITA de usePedidos nunca era exercitado.
 * O RLS filtra a linha em silencio (0 linhas, sem erro), entao updatePedido e
 * bulkUpdateStatus comemoravam "atualizado" sem gravar nada.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const h = vi.hoisted(() => {
  const estado = { atualizando: false };
  const resultado = { data: [] as { id: string }[] | null, error: null as { message: string } | null };
  return {
    estado,
    resultado,
    chain: {} as Record<string, unknown>,
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
  chain['update'] = vi.fn(() => { estado.atualizando = true; return chain; });
  for (const metodo of ['eq', 'in', 'order', 'range', 'or', 'gte', 'lte', 'limit']) {
    chain[metodo] = vi.fn(() => chain);
  }
  chain['select'] = vi.fn(() => (estado.atualizando ? Promise.resolve(resultado) : chain));
  return {
    supabase: {
      from: vi.fn(() => { estado.atualizando = false; return chain; }),
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

describe('usePedidos - escrita negada pelo RLS nao vira sucesso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.estado.atualizando = false;
    h.resultado.data = [];
    h.resultado.error = null;
  });

  it('updatePedido com 0 linhas afetadas retorna false e nao comemora', async () => {
    h.resultado.data = [];
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.updatePedido('p1', { status: 'confirmado' }); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('não tem permissão para alterar'));
  });

  it('updatePedido com linha afetada continua atualizando', async () => {
    h.resultado.data = [{ id: 'p1' }];
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = false;
    await act(async () => { ok = await result.current.updatePedido('p1', { status: 'confirmado' }); });

    expect(ok).toBe(true);
    expect(h.toast.success).toHaveBeenCalledWith('Pedido atualizado!');
  });

  it('bulkUpdateStatus sem nenhuma linha afetada falha e explica', async () => {
    h.resultado.data = [];
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.bulkUpdateStatus(['p1', 'p2'], 'confirmado'); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('Nenhum pedido foi atualizado'));
  });

  it('bulkUpdateStatus parcial avisa quantos ficaram de fora', async () => {
    h.resultado.data = [{ id: 'p1' }];
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.bulkUpdateStatus(['p1', 'p2'], 'confirmado'); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.warning).toHaveBeenCalledWith(expect.stringContaining('1 de 2'));
  });

  it('bulkUpdateStatus com todas as linhas afetadas comemora a contagem real', async () => {
    h.resultado.data = [{ id: 'p1' }, { id: 'p2' }];
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = false;
    await act(async () => { ok = await result.current.bulkUpdateStatus(['p1', 'p2'], 'confirmado'); });

    expect(ok).toBe(true);
    expect(h.toast.success).toHaveBeenCalledWith('2 pedido(s) atualizado(s)!');
  });
});