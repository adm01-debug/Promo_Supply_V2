import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFornecedores } from '../useFornecedores';

// Etapa QA 132 (DB-04 parte 2/4): creditos_fornecedor.fornecedor_id esta em
// ON DELETE CASCADE, entao excluir o fornecedor apagava o saldo de credito
// (dinheiro) junto. A exclusao agora confere credito, pagamento e pedido.

const toastError = vi.fn();
const deletesExecutados: string[] = [];
let contagens: Record<string, number> = {};

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, organizationId: 'org1', tenantId: 'org1' }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('@/services/auditService', () => ({ auditHelpers: { logInsert: vi.fn(), logUpdate: vi.fn() } }));

vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));

vi.mock('@/lib/supabaseQuery', () => ({ escapeIlike: (v: string) => v }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => ({
      select: () => ({
        eq: (_coluna: string, valor: string) =>
          Promise.resolve({ count: contagens[tabela] ?? 0, error: null, data: null, id: valor }),
      }),
      delete: () => ({
        eq: () => {
          deletesExecutados.push(tabela);
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('guarda de exclusao de fornecedor', () => {
  beforeEach(() => {
    toastError.mockClear();
    deletesExecutados.length = 0;
    contagens = {};
  });

  it('recusa excluir fornecedor que tem credito de fornecedor', async () => {
    contagens = { creditos_fornecedor: 2 };

    const { result } = renderHook(() => useFornecedores(), { wrapper });
    await waitFor(() => expect(result.current).toBeTruthy());

    let retorno: boolean | undefined;
    await act(async () => {
      retorno = await result.current.deleteFornecedor('f1');
    });

    expect(retorno).toBe(false);
    expect(deletesExecutados).toEqual([]);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(String(toastError.mock.calls[0][0])).toContain('2 credito(s) de fornecedor');
  });

  it('recusa excluir fornecedor com pagamento ou pedido e lista tudo o que bloqueia', async () => {
    contagens = { pagamentos: 1, pedidos: 3 };

    const { result } = renderHook(() => useFornecedores(), { wrapper });
    await waitFor(() => expect(result.current).toBeTruthy());

    let retorno: boolean | undefined;
    await act(async () => {
      retorno = await result.current.deleteFornecedor('f2');
    });

    expect(retorno).toBe(false);
    expect(deletesExecutados).toEqual([]);
    const mensagem = String(toastError.mock.calls[0][0]);
    expect(mensagem).toContain('1 pagamento(s)');
    expect(mensagem).toContain('3 pedido(s)');
  });

  it('exclui quando nao ha nenhum dependente', async () => {
    const { result } = renderHook(() => useFornecedores(), { wrapper });
    await waitFor(() => expect(result.current).toBeTruthy());

    let retorno: boolean | undefined;
    await act(async () => {
      retorno = await result.current.deleteFornecedor('f3');
    });

    expect(retorno).toBe(true);
    expect(deletesExecutados).toEqual(['fornecedores']);
    expect(toastError).not.toHaveBeenCalled();
  });
});
