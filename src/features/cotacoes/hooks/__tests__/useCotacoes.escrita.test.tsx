/**
 * TST-06 (etapa 282): o caminho de ESCRITA de useCotacoes nunca era exercitado.
 * O RLS filtra a linha em silencio (0 linhas, sem erro), entao updateCotacao,
 * selectCotacao e deleteCotacao comemoravam sucesso sem gravar nada - e no caso
 * da selecao a solicitacao ficava com a vencedora antiga desmarcada e nenhuma
 * nova no lugar (fornecedor escolhido desaparecia da tela).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const h = vi.hoisted(() => {
  const estado = {
    modo: 'leitura' as 'leitura' | 'escrita',
    lista: [] as Record<string, unknown>[],
    afetadas: [] as { id: string }[],
    erro: null as { message: string } | null,
    inserido: null as Record<string, unknown> | null,
    ultima: null as { op: string; tabela: string; valores?: unknown } | null,
    // O invalidate() dispara um refetch, que zera `ultima`; o historico fica
    // num array proprio para a assercao nao depender do timing do refetch.
    operacoes: [] as { op: string; valores?: unknown }[],
        // Status devolvido pela releitura de solicitacoes feita apos a selecao.
        statusSolicitacao: 'aprovada' as string,
  };
  return {
    estado,
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
    audit: { logCreate: vi.fn(async () => undefined), logApprove: vi.fn(async () => undefined) },
  };
});

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'u@x.com' }, organizationId: 'org-1' }),
}));
vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));
vi.mock('@/lib/feedbackToast', () => ({ toast: h.toast }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/services/auditService', () => ({ auditHelpers: h.audit }));

vi.mock('@/integrations/supabase/client', () => {
  const estado = h.estado;

  const cadeia = () => {
    const c: Record<string, unknown> = {};
    const resolver = () =>
      estado.modo === 'escrita'
        ? { data: estado.afetadas, error: estado.erro }
        : { data: estado.lista, error: null };

    for (const metodo of ['select', 'eq', 'in', 'or', 'gte', 'lte', 'order', 'range', 'limit', 'neq']) {
      c[metodo] = () => c;
    }
    c.update = (valores: unknown) => {
      estado.modo = 'escrita';
      estado.ultima = { op: 'update', tabela: 'cotacoes', valores };
      estado.operacoes.push({ op: 'update', valores });
      return c;
    };
    c.insert = (valores: unknown) => {
      estado.modo = 'escrita';
      estado.ultima = { op: 'insert', tabela: 'cotacoes', valores };
      estado.operacoes.push({ op: 'insert', valores });
      return c;
    };
    c.delete = () => {
      estado.modo = 'escrita';
      estado.ultima = { op: 'delete', tabela: 'cotacoes' };
      estado.operacoes.push({ op: 'delete' });
      return c;
    };
    c.then = (ok: (v: unknown) => unknown, falha: (e: unknown) => unknown) =>
      Promise.resolve(resolver()).then(ok, falha);
    c.single = () => Promise.resolve({ data: estado.inserido, error: estado.erro });
        c.maybeSingle = () => Promise.resolve({ data: { status: estado.statusSolicitacao }, error: null });
    return c;
  };

  return {
    supabase: {
      from: () => {
        estado.modo = 'leitura';
        estado.ultima = null;
        return cadeia();
      },
      rpc: vi.fn(async () => ({ data: 'COT-0007', error: null })),
    },
  };
});

import { useCotacoes } from '../useCotacoes';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const cotacao = {
  id: 'cot-1', numero: 'COT-1', status: 'enviada', solicitacao_id: 'sol-1',
  fornecedor_id: 'for-1', selecionada: false, valor_unitario: 10, quantidade: 2,
  organization_id: 'org-1', tenant_id: 'org-1',
};

describe('useCotacoes - escrita negada pelo RLS nao vira sucesso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.estado.modo = 'leitura';
    h.estado.lista = [cotacao];
    h.estado.afetadas = [];
    h.estado.erro = null;
    h.estado.inserido = { id: 'cot-nova', numero: 'COT-0007' };
    h.estado.ultima = null;
    h.estado.operacoes = [];
        h.estado.statusSolicitacao = 'aprovada';
  });

  it('updateCotacao com 0 linhas afetadas retorna false e nao anuncia sucesso', async () => {
    const { result } = renderHook(() => useCotacoes(), { wrapper });

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateCotacao('cot-1', { valor_unitario: 99 }); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('Nada foi gravado'));
  });

  it('updateCotacao com a linha gravada continua retornando true', async () => {
    h.estado.afetadas = [{ id: 'cot-1' }];
    const { result } = renderHook(() => useCotacoes(), { wrapper });

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateCotacao('cot-1', { valor_unitario: 99 }); });

    expect(ok).toBe(true);
    expect(h.toast.success).toHaveBeenCalledWith('Cotação atualizada!');
  });

  it('deleteCotacao com 0 linhas afetadas retorna false e nao anuncia sucesso', async () => {
    const { result } = renderHook(() => useCotacoes(), { wrapper });

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.deleteCotacao('cot-1'); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('Nada foi excluído'));
  });

  it('selectCotacao recusada pelo RLS retorna false, nao anuncia vencedor e nao grava auditoria', async () => {
    const { result } = renderHook(() => useCotacoes(), { wrapper });
    await waitFor(() => expect(result.current.cotacoes).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.selectCotacao('cot-1', 'melhor preco'); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('Nada foi gravado'));
    expect(h.audit.logApprove).not.toHaveBeenCalled();
  });

  it('selectCotacao grava a vencedora com status aprovada e desmarca as outras da solicitacao', async () => {
    h.estado.afetadas = [{ id: 'cot-1' }];
    const { result } = renderHook(() => useCotacoes(), { wrapper });
    await waitFor(() => expect(result.current.cotacoes).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.selectCotacao('cot-1', 'melhor preco'); });

    expect(ok).toBe(true);
    const gravacao = h.estado.operacoes[h.estado.operacoes.length - 1];
    expect(gravacao.op).toBe('update');
    expect(gravacao.valores).toMatchObject({
      selecionada: true, status: 'aprovada', justificativa_selecao: 'melhor preco',
    });
    expect(h.audit.logApprove).toHaveBeenCalled();
    expect(h.toast.success).toHaveBeenCalledWith('Fornecedor selecionado!');
  });

      it('selectCotacao com workflow de alcada pendente nao anuncia aprovacao da solicitacao', async () => {
        // A migration _fix_cotacao_nao_aprova_solicitacao impede o trigger de
        // promover a solicitacao quando existe workflow nao aprovado; a tela tem
        // que dizer isso em vez de comemorar a aprovacao.
        h.estado.afetadas = [{ id: 'cot-1' }];
        h.estado.statusSolicitacao = 'pendente';
        const { result } = renderHook(() => useCotacoes(), { wrapper });
        await waitFor(() => expect(result.current.cotacoes).toHaveLength(1));

        let ok: boolean | undefined;
        await act(async () => { ok = await result.current.selectCotacao('cot-1', 'melhor preco'); });

        expect(ok).toBe(true);
        expect(h.toast.success).toHaveBeenCalledWith(expect.stringContaining('aguarda aprova'));
        expect(h.toast.success).not.toHaveBeenCalledWith('Fornecedor selecionado!');
      });

  it('createCotacao grava o total calculado e o escopo da organizacao', async () => {
    const { result } = renderHook(() => useCotacoes(), { wrapper });

    let criada: unknown;
    await act(async () => {
      criada = await result.current.createCotacao({
        solicitacao_id: 'sol-1', fornecedor_id: 'for-1', valor_unitario: 10, quantidade: 3, valor_frete: 5,
      });
    });

    expect(criada).toMatchObject({ id: 'cot-nova', numero: 'COT-0007' });
    const gravacao = h.estado.operacoes[h.estado.operacoes.length - 1];
    expect(gravacao.op).toBe('insert');
    expect(gravacao.valores).toMatchObject({
      numero: 'COT-0007', valor_total: 35, quantidade: 3, organization_id: 'org-1', tenant_id: 'org-1',
    });
    expect(h.audit.logCreate).toHaveBeenCalled();
  });

  it('createCotacao com erro do banco retorna null e nao anuncia sucesso', async () => {
    h.estado.erro = { message: 'permission denied' };
    const { result } = renderHook(() => useCotacoes(), { wrapper });

    let criada: unknown = 'x';
    await act(async () => {
      criada = await result.current.createCotacao({ valor_unitario: 10 });
    });

    expect(criada).toBeNull();
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('Erro ao adicionar cotação'));
  });
});