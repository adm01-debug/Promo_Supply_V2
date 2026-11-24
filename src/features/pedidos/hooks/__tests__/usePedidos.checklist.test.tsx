import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Etapa QA 133 (DB-04 parte 3/4): receiving_checklists.pedido_id esta em
// ON DELETE CASCADE. O filtro por status ja barra pedido recebido; esta guarda
// cobre o checklist criado antes da transicao de status.

const estado = vi.hoisted(() => ({
  checklists: [] as { pedido_id: string | null }[],
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
        if (tabela === 'receiving_checklists') {
          return {
            select: () =>
              cadeia({
                data: estado.checklists,
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

import { usePedidos } from '../usePedidos';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('usePedidos - exclusao guardada por checklist de recebimento', () => {
  beforeEach(() => {
    estado.checklists = [];
    estado.falharContagem = false;
    estado.excluidos = [];
    vi.clearAllMocks();
  });

  it('recusa excluir pedido com checklist de recebimento', async () => {
    estado.checklists = [{ pedido_id: 'p1' }];
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.deletePedido('p1'); });

    expect(ok).toBe(false);
    expect(estado.excluidos).toEqual([]);
    expect(estado.toast.error).toHaveBeenCalledWith(expect.stringContaining('checklist de recebimento'));
  });

  it('bulkDelete recusa o lote inteiro quando algum pedido tem checklist', async () => {
    estado.checklists = [{ pedido_id: 'p2' }];
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.bulkDelete(['p1', 'p2']); });

    expect(ok).toBe(false);
    expect(estado.excluidos).toEqual([]);
  });

  it('erro na contagem de checklist cancela a exclusao', async () => {
    estado.falharContagem = true;
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.deletePedido('p1'); });

    expect(ok).toBe(false);
    expect(estado.excluidos).toEqual([]);
    expect(estado.toast.error).toHaveBeenCalledWith(expect.stringContaining('Não foi possível conferir'));
  });

  it('exclui pedido sem checklist', async () => {
    const { result } = renderHook(() => usePedidos(), { wrapper });

    let ok = false;
    await act(async () => { ok = await result.current.deletePedido('p1'); });

    expect(ok).toBe(true);
    expect(estado.excluidos).toEqual(['p1']);
    expect(estado.toast.success).toHaveBeenCalled();
  });
});
