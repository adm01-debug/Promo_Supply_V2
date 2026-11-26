/**
 * TST-06 (etapa 282): o caminho de ESCRITA de usePagamentos so tinha os testes
 * de transicao (bulkStatus) e de exclusao guardada pelo historico. Faltava o
 * caso-base: o RLS filtra a linha em silencio (0 linhas, sem erro) e o hook
 * anunciava "Pagamento atualizado!" / "Pagamento excluido!" com o banco intacto.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const h = vi.hoisted(() => {
  const estado = {
    lista: [] as Record<string, unknown>[],
    historico: [] as { pagamento_id: string | null }[],
    afetadas: [] as { id: string }[],
    erro: null as { message: string } | null,
    operacoes: [] as { op: string; tabela: string; valores?: unknown }[],
  };
  return {
    estado,
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
    audit: { logCreate: vi.fn(async () => undefined), logUpdate: vi.fn(async () => undefined) },
  };
});

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'u@x.com' }, organizationId: 'org-1' }),
}));
vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));
vi.mock('@/lib/feedbackToast', () => ({ toast: h.toast }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/services/auditService', () => ({ auditHelpers: h.audit }));
vi.mock('@/lib/supabaseQuery', () => ({ escapeIlike: (v: string) => v }));

vi.mock('@/integrations/supabase/client', () => {
  const estado = h.estado;
  let escrevendo = false;

  const cadeia = (tabela: string) => {
    const c: Record<string, unknown> = {};
    const resolver = () =>
      tabela === 'payment_history'
        ? { data: estado.historico, error: estado.erro }
        : escrevendo
          ? { data: estado.afetadas, error: estado.erro }
          : { data: estado.lista, error: null, count: estado.lista.length };

    for (const metodo of ['select', 'eq', 'in', 'or', 'gte', 'lte', 'order', 'range', 'limit', 'ilike']) {
      c[metodo] = () => c;
    }
    c.update = (valores: unknown) => {
      escrevendo = true;
      estado.operacoes.push({ op: 'update', tabela, valores });
      return c;
    };
    c.insert = (valores: unknown) => {
      escrevendo = true;
      estado.operacoes.push({ op: 'insert', tabela, valores });
      return c;
    };
    c.delete = () => {
      escrevendo = true;
      estado.operacoes.push({ op: 'delete', tabela });
      return c;
    };
    c.then = (ok: (v: unknown) => unknown, falha: (e: unknown) => unknown) =>
      Promise.resolve(resolver()).then(ok, falha);
    c.single = () => Promise.resolve({ data: estado.afetadas[0] ?? null, error: estado.erro });
    return c;
  };

  return {
    supabase: {
      from: (tabela: string) => {
        if (tabela !== 'payment_history') escrevendo = false;
        return cadeia(tabela);
      },
      rpc: vi.fn(async () => ({ data: 'PAG-0003', error: null })),
    },
  };
});

import { usePagamentos } from '../usePagamentos';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const pagamento = {
  id: 'pg1', numero: 'PAG-1', status: 'aprovado', valor: 100, valor_pago: 0,
  organization_id: 'org-1', tenant_id: 'org-1',
};

async function montar() {
  const { result } = renderHook(() => usePagamentos(), { wrapper });
  await waitFor(() => expect(result.current.pagamentos).toHaveLength(1));
  return result;
}

describe('usePagamentos - escrita negada pelo RLS nao vira sucesso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.estado.lista = [pagamento];
    h.estado.historico = [];
    h.estado.afetadas = [];
    h.estado.erro = null;
    h.estado.operacoes = [];
  });

  it('updatePagamento com 0 linhas afetadas retorna false e nao anuncia sucesso', async () => {
    const result = await montar();

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updatePagamento('pg1', { valor: 250 }); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('Nada foi gravado'));
  });

  it('updatePagamento com a linha gravada continua retornando true', async () => {
    h.estado.afetadas = [{ id: 'pg1' }];
    const result = await montar();

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updatePagamento('pg1', { valor: 250 }); });

    expect(ok).toBe(true);
    expect(h.toast.success).toHaveBeenCalledWith('Pagamento atualizado!');
    expect(h.estado.operacoes[h.estado.operacoes.length - 1].valores).toMatchObject({ valor: 250 });
  });

  it('updatePagamento recusa transicao invalida sem tocar o banco', async () => {
    // aprovado -> agendado o banco aceita; o que a tela precisa barrar e
    // pendente -> agendado (pularia a aprovacao).
    h.estado.lista = [{ ...pagamento, status: 'pendente' }];
    const result = await montar();

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updatePagamento('pg1', { status: 'agendado' }); });

    expect(ok).toBe(false);
    expect(h.estado.operacoes).toHaveLength(0);
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('Transição inválida'));
  });

  it('deletePagamento com 0 linhas afetadas retorna false e nao anuncia sucesso', async () => {
    const result = await montar();

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.deletePagamento('pg1'); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('Nada foi excluído'));
  });

  it('bulkDelete com 0 linhas afetadas retorna false e nao anuncia exclusao', async () => {
    const result = await montar();

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.bulkDelete(['pg1']); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.warning).toHaveBeenCalledWith(expect.stringContaining('0 de 1'));
  });

  it('bulkUpdateStatus com 0 linhas afetadas retorna false e nao anuncia atualizacao', async () => {
    const result = await montar();

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.bulkUpdateStatus(['pg1'], 'pago'); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('Nada foi gravado'));
  });

  it('createPagamento grava o escopo e o numero sequencial do banco', async () => {
    h.estado.afetadas = [{ id: 'pg-novo' }];
    const result = await montar();

    let criado: unknown;
    await act(async () => {
      criado = await result.current.createPagamento({
        fornecedor_id: 'for-1', valor: 150, data_vencimento: '2026-12-01', numero_nf: 'NF-9',
      });
    });

    expect(criado).toMatchObject({ id: 'pg-novo' });
    const gravacao = h.estado.operacoes[h.estado.operacoes.length - 1];
    expect(gravacao.op).toBe('insert');
    expect(gravacao.valores).toMatchObject({
      numero: 'PAG-0003', valor: 150, created_by: 'u1', organization_id: 'org-1', tenant_id: 'org-1',
    });
    expect(h.audit.logCreate).toHaveBeenCalled();
  });

  it('createPagamento com erro do banco retorna null e nao anuncia sucesso', async () => {
    h.estado.erro = { message: 'permission denied' };
    const result = await montar();

    let criado: unknown = 'x';
    await act(async () => {
      criado = await result.current.createPagamento({ fornecedor_id: 'for-1', valor: 150, data_vencimento: '2026-12-01' });
    });

    expect(criado).toBeNull();
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('Erro ao registrar pagamento'));
  });
});