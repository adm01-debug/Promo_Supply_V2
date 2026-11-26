import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDevolucoes } from '../useDevolucoes';

// Etapa QA 132 (DB-04 parte 2/4): creditos_fornecedor.devolucao_id esta em
// ON DELETE SET NULL. Apagar a devolucao deixava o credito orfao, com saldo
// sem origem. A exclusao agora recusa quando existe credito gerado.

const toastError = vi.fn();
const deletesExecutados: string[] = [];
let creditosDaDevolucao = 0;
let devolucaoAtual = {
  id: 'd1',
  numero: 'DEV-1',
  status: 'recebida_fornecedor',
  fornecedor_id: 'f1',
  pedido_id: null,
  valor_total: 150,
  tenant_id: 'org1',
  organization_id: 'org1',
};

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, organizationId: 'org1', tenantId: 'org1' }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() },
}));

vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));

vi.mock('@/lib/supabaseQuery', () => ({ escapeIlike: (v: string) => v }));

vi.mock('@/lib/creditoFornecedor', () => ({ calcularAbatimentoCredito: () => 0 }));

const cadeia = (resultado: unknown) => {
  const p = Promise.resolve(resultado) as any;
  p.eq = () => p;
  p.in = () => p;
  p.order = () => p;
  p.ilike = () => p;
  p.limit = () => p;
  p.single = () => p;
  return p;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => {
      if (tabela === 'creditos_fornecedor') {
        return {
          select: () => cadeia({ count: creditosDaDevolucao, error: null, data: null }),
        };
      }
      if (tabela === 'devolucoes') {
        return {
          select: () => cadeia({ data: [devolucaoAtual], error: null }),
          delete: () => ({
            eq: () => {
              deletesExecutados.push(tabela);
              const r = Promise.resolve({ error: null, data: [{ id: 'd1' }] }) as Promise<unknown> & { select: () => Promise<unknown> };
              r.select = () => Promise.resolve({ error: null, data: [{ id: 'd1' }] });
              return r;
            },
          }),
        };
      }
      return { select: () => cadeia({ data: [], error: null }) };
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('guarda de exclusao de devolucao', () => {
  beforeEach(() => {
    toastError.mockClear();
    deletesExecutados.length = 0;
    creditosDaDevolucao = 0;
    devolucaoAtual = { ...devolucaoAtual, status: 'recebida_fornecedor' };
  });

  it('recusa excluir devolucao que ja gerou credito', async () => {
    creditosDaDevolucao = 1;

    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes.length).toBeGreaterThan(0));

    let retorno: boolean | undefined;
    await act(async () => {
      retorno = await result.current.deleteDevolucao('d1');
    });

    expect(retorno).toBe(false);
    expect(deletesExecutados).toEqual([]);
    expect(String(toastError.mock.calls[0][0])).toContain('credito gerado');
  });

  it('recusa excluir devolucao marcada como credito_emitido mesmo sem contagem', async () => {
    devolucaoAtual = { ...devolucaoAtual, status: 'credito_emitido' };

    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes.length).toBeGreaterThan(0));

    let retorno: boolean | undefined;
    await act(async () => {
      retorno = await result.current.deleteDevolucao('d1');
    });

    expect(retorno).toBe(false);
    expect(deletesExecutados).toEqual([]);
  });

  it('exclui devolucao sem credito', async () => {
    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes.length).toBeGreaterThan(0));

    let retorno: boolean | undefined;
    await act(async () => {
      retorno = await result.current.deleteDevolucao('d1');
    });

    expect(retorno).toBe(true);
    expect(deletesExecutados).toEqual(['devolucoes']);
    expect(toastError).not.toHaveBeenCalled();
  });
});
