import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDevolucoes } from '../useDevolucoes';

// Etapa QA 097 (NEG-12): o credito do fornecedor era inserido sem checar { error } e o
// toast de sucesso aparecia mesmo quando nada tinha sido gravado, deixando a devolucao
// presa em 'credito_emitido' sem nenhuma linha em creditos_fornecedor.

const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, organizationId: 'org1', tenantId: 'org1' }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) },
}));

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));

const devolucao = {
  id: 'd1',
  numero: 'DEV-1',
  status: 'recebida_fornecedor',
  fornecedor_id: 'f1',
  pedido_id: null,
  valor_total: 150,
  tenant_id: 'org1',
  organization_id: 'org1',
};

const statusGravados: Array<Record<string, unknown>> = [];
const creditosInseridos: Array<Record<string, unknown>> = [];
let erroDoCredito: { message: string } | null = null;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => {
      if (tabela === 'creditos_fornecedor') {
        return {
          insert: (payload: Record<string, unknown>) => {
            creditosInseridos.push(payload);
            return Promise.resolve({ error: erroDoCredito });
          },
        };
      }
      if (tabela === 'devolucoes') {
        return {
          select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [devolucao], error: null }) }) }),
          update: (updates: Record<string, unknown>) => ({
            eq: () => {
              statusGravados.push(updates);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      return { select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) };
    },
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useDevolucoes · credito do fornecedor (NEG-12)', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastSuccess.mockClear();
    statusGravados.length = 0;
    creditosInseridos.length = 0;
    erroDoCredito = null;
  });

  it('nao deixa a devolucao em credito_emitido quando o credito nao grava', async () => {
    erroDoCredito = { message: 'permission denied for table creditos_fornecedor' };
    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.updateStatus('d1', 'credito_emitido');
    });

    expect(ok).toBe(false);
    expect(creditosInseridos).toHaveLength(1);
    expect(statusGravados).toEqual([{ status: 'credito_emitido' }, { status: 'recebida_fornecedor' }]);
    expect(toastSuccess).not.toHaveBeenCalledWith('Crédito gerado automaticamente!');
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('permission denied'));
  });

  it('grava o credito com o valor da devolucao e so entao avisa sucesso', async () => {
    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.updateStatus('d1', 'credito_emitido');
    });

    expect(ok).toBe(true);
    expect(statusGravados).toEqual([{ status: 'credito_emitido' }]);
    expect(creditosInseridos[0]).toMatchObject({
      devolucao_id: 'd1',
      fornecedor_id: 'f1',
      valor: 150,
      saldo: 150,
      tenant_id: 'org1',
    });
    expect(toastSuccess).toHaveBeenCalledWith('Crédito gerado automaticamente!');
  });
});