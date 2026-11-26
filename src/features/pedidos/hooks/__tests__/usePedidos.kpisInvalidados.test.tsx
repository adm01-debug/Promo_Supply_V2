/**
 * HK-05 (etapa 190): mesma causa de `usePagamentosKPIs`. Os cartoes de pedido viviam em
 * `['pedidos-kpis', ...]` enquanto as mutacoes e o realtime invalidam o prefixo
 * `['pedidos']` (`usePedidos.ts`, `queryKeysToInvalidate: [['pedidos']]`). Chave irma,
 * match posicional: o invalidate nao chegava nos cartoes.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const h = vi.hoisted(() => ({
  rpc: vi.fn(async () => ({ data: { total: 3, pendentes: 1, emTransito: 1, entregues: 1, valorTotal: 99 }, error: null })),
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'u@x.com' }, organizationId: 'org-1' }),
}));
vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));
vi.mock('@/lib/feedbackToast', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/services/auditService', () => ({ auditHelpers: { logCreate: vi.fn(), logUpdate: vi.fn(), logDelete: vi.fn() } }));
vi.mock('@/lib/supabaseQuery', () => ({ escapeIlike: (v: string) => v }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: h.rpc } }));

import { usePedidosKPIs } from '@/features/pedidos/hooks/usePedidos';

function criarCliente() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

describe('usePedidosKPIs - alcance do invalidate (etapa 190)', () => {
  it('invalidar o prefixo [pedidos] refaz a consulta dos cartoes', async () => {
    const queryClient = criarCliente();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePedidosKPIs(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    const chamadasIniciais = h.rpc.mock.calls.length;
    expect(chamadasIniciais).toBeGreaterThan(0);

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    });

    await waitFor(() => expect(h.rpc.mock.calls.length).toBe(chamadasIniciais + 1));
  });
});