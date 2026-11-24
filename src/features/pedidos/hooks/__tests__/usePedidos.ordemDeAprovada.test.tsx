import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePedidos } from '../usePedidos';

// Etapa QA 088 (NEG-06, parte 2): a ordem de compra era gravada para solicitacao em
// qualquer status; o UPDATE que a promovia para 'em_andamento' era recusado pelo banco
// e o erro era descartado. Agora o hook recusa a criacao sem 'aprovada'.

const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, organizationId: 'org1' }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) },
}));

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));

vi.mock('@/services/auditService', () => ({ auditHelpers: { logCreate: vi.fn() } }));

const pedidosInseridos: Array<Record<string, unknown>> = [];
let statusDaSolicitacao = 'pendente';

function consulta(resultado: unknown) {
  const p: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') return (ok: (v: unknown) => unknown) => Promise.resolve(resultado).then(ok);
        return () => p;
      },
    }
  );
  return p;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: () => Promise.resolve({ data: 'PED-900', error: null }),
    from: (tabela: string) => {
      if (tabela === 'solicitacoes') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { status: statusDaSolicitacao }, error: null }) }) }) };
      }
      if (tabela === 'pedidos') {
        return {
          select: () => consulta({ data: [], count: 0, error: null }),
          insert: (payload: Record<string, unknown>) => {
            pedidosInseridos.push(payload);
            return { select: () => ({ single: () => Promise.resolve({ data: { id: 'p1', numero: 'PED-900' }, error: null }) }) };
          },
        };
      }
      if (tabela === 'pedido_itens') return { insert: () => Promise.resolve({ error: null }) };
      return { select: () => consulta({ data: [], error: null }) };
    },
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const entrada = {
  solicitacao_id: 's1',
  fornecedor_id: 'f1',
  valor_total: 500,
  itens: [{ descricao: 'Item', quantidade: 2, unidade: 'un', valor_unitario: 250 }],
};

describe('usePedidos · ordem de compra so com solicitacao aprovada (NEG-06)', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastSuccess.mockClear();
    pedidosInseridos.length = 0;
    statusDaSolicitacao = 'pendente';
  });

  it('nao cria a ordem quando a solicitacao nao esta aprovada', async () => {
    const { result } = renderHook(() => usePedidos(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let pedido: unknown;
    await act(async () => {
      pedido = await result.current.createPedido(entrada);
    });

    expect(pedido).toBeNull();
    expect(pedidosInseridos).toHaveLength(0);
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('aprovada'));
  });

  it('cria a ordem quando a solicitacao esta aprovada', async () => {
    statusDaSolicitacao = 'aprovada';
    const { result } = renderHook(() => usePedidos(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let pedido: unknown;
    await act(async () => {
      pedido = await result.current.createPedido(entrada);
    });

    expect(pedido).toMatchObject({ id: 'p1', numero: 'PED-900' });
    expect(pedidosInseridos[0]).toMatchObject({ solicitacao_id: 's1', fornecedor_id: 'f1', valor_total: 500 });
  });
});