import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Etapa QA 133 (DB-04 parte 3/4): cotacoes.solicitacao_id e
// approval_workflows.solicitacao_id estao em ON DELETE CASCADE e
// approval_history.solicitacao_id em SET NULL. O DELETE apagava as propostas
// de fornecedor e a trilha de aprovacao, ou deixava o historico orfao.

const estado = vi.hoisted(() => ({
  dependentes: {} as Record<string, { solicitacao_id: string | null }[]>,
  falharContagem: false,
  excluidos: [] as string[],
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

const DEPENDENTES = ['cotacoes', 'approval_workflows', 'approval_history'];

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'u@x.com' }, organizationId: 'org-1' }),
}));
vi.mock('@/hooks/useApprovalWorkflow', () => ({ useApprovalWorkflow: () => ({ createWorkflow: vi.fn() }) }));
vi.mock('@/lib/feedbackToast', () => ({ toast: estado.toast }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/services/auditService', () => ({ auditHelpers: { logInsert: vi.fn(), logUpdate: vi.fn() } }));
vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));

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
        if (DEPENDENTES.includes(tabela)) {
          const linhas = estado.dependentes[tabela] ?? [];
          return {
            select: () =>
              cadeia({
                data: linhas,
                error: estado.falharContagem ? { message: 'sem permissao' } : null,
              }),
          };
        }

        const deletado = {
          then: (resolver: (v: unknown) => unknown) =>
            resolver({ data: estado.excluidos.map((id) => ({ id })), error: null }),
        } as Record<string, unknown>;
        deletado.select = () => deletado;
        deletado.eq = (_coluna: string, valor: string) => {
          estado.excluidos.push(valor);
          return deletado;
        };
        deletado.in = (_coluna: string, valores: string[]) => {
          estado.excluidos.push(...valores);
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

import { useSolicitacoes } from '../useSolicitacoes';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useSolicitacoes - exclusao guardada por historico', () => {
  beforeEach(() => {
    estado.dependentes = {};
    estado.falharContagem = false;
    estado.excluidos = [];
    vi.clearAllMocks();
  });

  it('recusa excluir solicitacao que tem cotacao de fornecedor', async () => {
    estado.dependentes = { cotacoes: [{ solicitacao_id: 's1' }, { solicitacao_id: 's1' }] };
    const { result } = renderHook(() => useSolicitacoes(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.deleteSolicitacao('s1'); });

    expect(ok).toBe(false);
    expect(estado.excluidos).toEqual([]);
    expect(estado.toast.error).toHaveBeenCalledWith(expect.stringContaining('não pode ser excluída'));
  });

  it('recusa excluir solicitacao que so tem historico de aprovacao', async () => {
    estado.dependentes = { approval_history: [{ solicitacao_id: 's1' }] };
    const { result } = renderHook(() => useSolicitacoes(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.deleteSolicitacao('s1'); });

    expect(ok).toBe(false);
    expect(estado.excluidos).toEqual([]);
  });

  it('erro na contagem cancela a exclusao em vez de apagar', async () => {
    estado.falharContagem = true;
    const { result } = renderHook(() => useSolicitacoes(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.deleteSolicitacao('s1'); });

    expect(ok).toBe(false);
    expect(estado.excluidos).toEqual([]);
    expect(estado.toast.error).toHaveBeenCalledWith(expect.stringContaining('Não foi possível conferir'));
  });

  it('exclui solicitacao sem cotacao nem historico', async () => {
    const { result } = renderHook(() => useSolicitacoes(), { wrapper });

    let ok = false;
    await act(async () => { ok = await result.current.deleteSolicitacao('s1'); });

    expect(ok).toBe(true);
    expect(estado.excluidos).toEqual(['s1']);
    expect(estado.toast.success).toHaveBeenCalled();
  });

  it('bulkDelete com todo o lote bloqueado nao apaga nada', async () => {
    estado.dependentes = { cotacoes: [{ solicitacao_id: 's1' }, { solicitacao_id: 's2' }] };
    const { result } = renderHook(() => useSolicitacoes(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.bulkDelete(['s1', 's2']); });

    expect(ok).toBe(false);
    expect(estado.excluidos).toEqual([]);
  });

  it('bulkDelete parcial apaga so as liberadas e avisa', async () => {
    estado.dependentes = { cotacoes: [{ solicitacao_id: 's1' }] };
    const { result } = renderHook(() => useSolicitacoes(), { wrapper });

    let ok = true;
    await act(async () => { ok = await result.current.bulkDelete(['s1', 's2']); });

    expect(ok).toBe(false);
    expect(estado.excluidos).toEqual(['s2']);
    expect(estado.toast.warning).toHaveBeenCalledWith(expect.stringContaining('1 de 2'));
  });

  it('bulkDelete sem dependentes exclui o lote inteiro', async () => {
    const { result } = renderHook(() => useSolicitacoes(), { wrapper });

    let ok = false;
    await act(async () => { ok = await result.current.bulkDelete(['s1', 's2']); });

    expect(ok).toBe(true);
    expect(estado.excluidos).toEqual(['s1', 's2']);
  });
});
