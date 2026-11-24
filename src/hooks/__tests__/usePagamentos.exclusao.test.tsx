import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Etapa QA 134 (DB-04 parte 4/4): payment_history.pagamento_id esta em
// ON DELETE CASCADE. Excluir o pagamento apagava quem alterou, de qual status
// para qual e com que valor. A exclusao agora exige historico vazio.

const estado = vi.hoisted(() => ({
  historico: [] as { pagamento_id: string | null }[],
  falharContagem: false,
  excluidos: [] as string[],
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'u@x.com' }, organizationId: 'org-1' }),
}));
vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));
vi.mock('@/lib/feedbackToast', () => ({ toast: estado.toast }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/services/auditService', () => ({ auditHelpers: { logInsert: vi.fn(), logUpdate: vi.fn() } }));
vi.mock('@/lib/supabaseQuery', () => ({ escapeIlike: (v: string) => v }));

vi.mock('@/integrations/supabase/client', () => {
  const cadeia = (resultado: unknown) => {
    const p = Promise.resolve(resultado) as unknown as Record<string, unknown>;
    for (const m of ['select', 'eq', 'in', 'or', 'gte', 'lte', 'order', 'range', 'limit', 'ilike']) {
      p[m] = () => p;
    }
    return p;
  };

  return {
    supabase: {
      from: (tabela: string) => {
        if (tabela === 'payment_history') {
          return {
            select: () =>
              cadeia({
                data: estado.historico,
                error: estado.falharContagem ? { message: 'sem permissao' } : null,
              }),
          };
        }

        const deletado = {
          then: (resolver: (v: unknown) => unknown) =>
            resolver({ data: estado.excluidos.map((id) => ({ id })), error: null }),
        } as Record<string, unknown>;
        deletado.select = () => deletado;
        deletado.eq = (coluna: string, valor: string) => {
          if (coluna === 'id') estado.excluidos.push(valor);
          return deletado;
        };
        deletado.in = (coluna: string, valores: string[]) => {
          if (coluna === 'id') estado.excluidos.push(...valores);
          return deletado;
        };

        const lista = cadeia({ data: [], error: null, count: 0 });
        lista.delete = () => deletado;
        return lista;
      },
      rpc: vi.fn(async () => ({ data: null, error: null })),
    },
  };
});

import { usePagamentos } from '../usePagamentos';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('usePagamentos - exclusao guardada pelo historico', () => {
  beforeEach(() => {
    estado.historico = [];
    estado.falharContagem = false;
    estado.excluidos = [];
    vi.clearAllMocks();
  });

  it('recusa excluir pagamento que tem historico de alteracao', async () => {
    estado.historico = [{ pagamento_id: 'pg1' }];
    const { result } = renderHook(() => usePagamentos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.deletePagamento('pg1'); });

    expect(ok).toBe(false);
    expect(estado.excluidos).toEqual([]);
    expect(estado.toast.error).toHaveBeenCalledWith(expect.stringContaining('histórico de alteração'));
  });

  it('bulkDelete exclui so os pagamentos sem historico e avisa', async () => {
    estado.historico = [{ pagamento_id: 'pg1' }];
    const { result } = renderHook(() => usePagamentos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.bulkDelete(['pg1', 'pg2']); });

    expect(ok).toBe(false);
    expect(estado.excluidos).toEqual(['pg2']);
    expect(estado.toast.warning).toHaveBeenCalledWith(expect.stringContaining('1 de 2'));
  });

  it('bulkDelete com todo o lote com historico nao apaga nada', async () => {
    estado.historico = [{ pagamento_id: 'pg1' }, { pagamento_id: 'pg2' }];
    const { result } = renderHook(() => usePagamentos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.bulkDelete(['pg1', 'pg2']); });

    expect(ok).toBe(false);
    expect(estado.excluidos).toEqual([]);
    expect(estado.toast.error).toHaveBeenCalledWith(expect.stringContaining('histórico de alteração'));
    expect(estado.toast.warning).not.toHaveBeenCalled();
  });

  it('erro na contagem de historico cancela a exclusao', async () => {
    estado.falharContagem = true;
    const { result } = renderHook(() => usePagamentos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.deletePagamento('pg1'); });

    expect(ok).toBe(false);
    expect(estado.excluidos).toEqual([]);
    expect(estado.toast.error).toHaveBeenCalledWith(expect.stringContaining('Não foi possível conferir'));
  });

  it('exclui pagamento sem historico', async () => {
    const { result } = renderHook(() => usePagamentos(), { wrapper });

    let ok = false;
    await act(async () => { ok = await result.current.deletePagamento('pg1'); });

    expect(ok).toBe(true);
    expect(estado.excluidos).toEqual(['pg1']);
    expect(estado.toast.success).toHaveBeenCalled();
  });
});
