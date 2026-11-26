import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePedidos } from '../usePedidos';

// Etapa QA 170 (INT-07, parte 2/2): o insert de `pedido_itens` nao checava `error`.
// Quando o banco recusava, o pedido ficava gravado sem nenhum item e a tela ainda
// dizia "Pedido criado com sucesso!" -- a OC ia ao fornecedor vazia.

const toastError = vi.fn();
const toastSuccess = vi.fn();
const loggerWarn = vi.fn();
const loggerError = vi.fn();

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, organizationId: 'org1' }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: (...a: unknown[]) => loggerWarn(...a),
    error: (...a: unknown[]) => loggerError(...a),
  },
}));

vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));

vi.mock('@/services/auditService', () => ({ auditHelpers: { logCreate: vi.fn() } }));

let resultadoItens: { data: Array<{ id: string }> | null; error: { message: string } | null } = {
  data: [{ id: 'i1' }],
  error: null,
};

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
    rpc: () => Promise.resolve({ data: 'PED-901', error: null }),
    from: (tabela: string) => {
      if (tabela === 'solicitacoes') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { status: 'aprovada' }, error: null }) }) }) };
      }
      if (tabela === 'pedidos') {
        return {
          select: () => consulta({ data: [], count: 0, error: null }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'p1', numero: 'PED-901' }, error: null }),
            }),
          }),
        };
      }
      if (tabela === 'pedido_itens') {
        return { insert: () => Promise.resolve(resultadoItens) };
      }
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

const entradaSemItens = { solicitacao_id: 's1', fornecedor_id: 'f1', valor_total: 500 };

describe('usePedidos - pedido nao pode ficar sem itens (etapa 170)', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastSuccess.mockClear();
    loggerWarn.mockClear();
    loggerError.mockClear();
    resultadoItens = { data: [{ id: 'i1' }], error: null };
  });

  it('avisa que os itens NAO foram gravados quando o banco recusa o insert', async () => {
    resultadoItens = { data: null, error: { message: 'new row violates row-level security policy' } };
    const { result } = renderHook(() => usePedidos(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let pedido: unknown;
    await act(async () => {
      pedido = await result.current.createPedido(entrada);
    });

    expect(pedido).toMatchObject({ id: 'p1', numero: 'PED-901' });
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('NAO foram'));
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('row-level security'));
    expect(loggerError).toHaveBeenCalled();
  });

  it('segue com sucesso quando os itens foram gravados', async () => {
    const { result } = renderHook(() => usePedidos(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createPedido(entrada);
    });

    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('registra em log o pedido criado sem lista de itens', async () => {
    const { result } = renderHook(() => usePedidos(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createPedido(entradaSemItens);
    });

    expect(loggerWarn).toHaveBeenCalledWith(
      'Pedido criado sem itens: entrada sem lista de itens',
      expect.objectContaining({ pedidoId: 'p1' }),
    );
    expect(toastSuccess).toHaveBeenCalled();
  });
});