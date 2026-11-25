import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDevolucoes, useCreditosFornecedor, useDevolucoesKPIs } from '../useDevolucoes';

// Etapa 283 (TST-06 parte 3/3): o caminho de escrita de useDevolucoes nao tinha
// teste de regra. Cada escrita passa por policy de RLS, e no PostgREST um
// UPDATE/DELETE barrado devolve 0 linhas e NENHUM erro - sem conferir as linhas
// afetadas o hook anunciava sucesso com o banco intacto.

const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, organizationId: 'org1', tenantId: 'org1' }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
  },
}));

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));

const devolucaoBase = () => ({
  id: 'd1',
  numero: 'DEV-1',
  status: 'recebida_fornecedor',
  fornecedor_id: 'f1',
  pedido_id: null,
  valor_total: 150,
  tenant_id: 'org1',
  organization_id: 'org1',
});

const creditoBase = () => ({
  id: 'c1',
  fornecedor_id: 'f1',
  devolucao_id: 'd1',
  saldo: 100,
  valor_utilizado: 0,
  status: 'ativo',
  tenant_id: 'org1',
  organization_id: 'org1',
});

const banco = {
  devolucoes: [] as Array<Record<string, unknown>>,
  devolucao_itens: [] as Array<Record<string, unknown>>,
  creditos_fornecedor: [] as Array<Record<string, unknown>>,
  fornecedores: [] as Array<Record<string, unknown>>,
  pedidos: [] as Array<Record<string, unknown>>,
};

const operacoes: string[] = [];
const barrado: Record<string, boolean> = {};
const erroDeInsert: Record<string, { message: string } | undefined> = {};
const erroDeContagem: Record<string, { message: string } | undefined> = {};
let numeroSequencial = 'DEV-2026';

function resultadoDe(
  tabela: string,
  tipo: string,
  payload: unknown,
  pediuContagem: boolean,
  filtros: Record<string, unknown>,
) {
  if (tipo === 'select' && pediuContagem) {
    return { data: null, count: erroDeContagem[tabela] ? null : (banco[tabela as keyof typeof banco]?.length ?? 0), error: erroDeContagem[tabela] ?? null };
  }
  if (tipo === 'select') {
    return { data: banco[tabela as keyof typeof banco] ?? [], error: null, count: null };
  }
  if (tipo === 'insert') {
    const erro = erroDeInsert[tabela];
    if (erro) return { data: null, error: erro, count: null };
    const linhas = (Array.isArray(payload) ? payload : [payload]) as Array<Record<string, unknown>>;
    const gravadas = linhas.map((l, i) => ({ id: l.id ?? `${tabela}-${i + 1}`, ...l }));
    banco[tabela as keyof typeof banco]?.push(...gravadas);
    return { data: Array.isArray(payload) ? gravadas : gravadas[0], error: null, count: null };
  }
  if (barrado[tabela]) return { data: [], error: null, count: null };

  const linhas = banco[tabela as keyof typeof banco] as Array<Record<string, unknown>> | undefined;
  if (!linhas) return { data: [{ id: 'afetada' }], error: null, count: null };
  const indice = linhas.findIndex(l => l.id === filtros.id);
  if (indice < 0) return { data: [], error: null, count: null };

  if (tipo === 'delete') {
    const [removida] = linhas.splice(indice, 1);
    return { data: [removida], error: null, count: null };
  }
  linhas[indice] = { ...linhas[indice], ...(payload as Record<string, unknown>) };
  return { data: [linhas[indice]], error: null, count: null };
}

function construtor(tabela: string, tipo: string, payload?: unknown) {
  const estado = { pediuContagem: false, filtros: {} as Record<string, unknown> };
  type Cadeia = {
    select: (colunas?: string, opcoes?: { count?: string; head?: boolean }) => Cadeia;
    eq: (coluna: string, valor: unknown) => Cadeia;
    in: () => Cadeia;
    order: () => Cadeia;
    or: () => Cadeia;
    ilike: () => Cadeia;
    limit: () => Cadeia;
    single: () => Promise<unknown>;
    maybeSingle: () => Promise<unknown>;
    then: (res?: (v: unknown) => unknown, rej?: (r: unknown) => unknown) => Promise<unknown>;
  };
  const b: Cadeia = {
    select(_colunas?: string, opcoes?: { count?: string; head?: boolean }) {
      estado.pediuContagem = opcoes?.count === 'exact';
      return b;
    },
    eq(coluna: string, valor: unknown) { estado.filtros[coluna] = valor; return b; },
    in() { return b; },
    order() { return b; },
    or() { return b; },
    ilike() { return b; },
    limit() { return b; },
    single() { return Promise.resolve(resultadoDe(tabela, tipo, payload, false, estado.filtros)); },
    maybeSingle() { return Promise.resolve(resultadoDe(tabela, tipo, payload, false, estado.filtros)); },
    then(res?: (v: unknown) => unknown, rej?: (r: unknown) => unknown) {
      return Promise.resolve(resultadoDe(tabela, tipo, payload, estado.pediuContagem, estado.filtros)).then(res, rej);
    },
  };
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (_nome: string, _args: unknown) => {
      operacoes.push('rpc:generate_sequential_number');
      return Promise.resolve({ data: numeroSequencial, error: null });
    },
    from: (tabela: string) => ({
      select: (colunas?: string, opcoes?: { count?: string; head?: boolean }) => {
        operacoes.push(`select:${tabela}`);
        return construtor(tabela, 'select', undefined).select(colunas, opcoes);
      },
      insert: (payload: unknown) => {
        operacoes.push(`insert:${tabela}`);
        return construtor(tabela, 'insert', payload);
      },
      update: (payload: unknown) => {
        operacoes.push(`update:${tabela}`);
        return construtor(tabela, 'update', payload);
      },
      delete: () => {
        operacoes.push(`delete:${tabela}`);
        return construtor(tabela, 'delete');
      },
    }),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

function limpar() {
  toastError.mockClear();
  toastSuccess.mockClear();
  operacoes.length = 0;
  banco.devolucoes = [devolucaoBase()];
  banco.devolucao_itens = [];
  banco.creditos_fornecedor = [];
  for (const chave of Object.keys(barrado)) delete barrado[chave];
  for (const chave of Object.keys(erroDeInsert)) delete erroDeInsert[chave];
  for (const chave of Object.keys(erroDeContagem)) delete erroDeContagem[chave];
  numeroSequencial = 'DEV-2026';
}

describe('useDevolucoes · regra de transicao de status', () => {
  beforeEach(limpar);

  it('recusa transicao fora da maquina de estados e nao grava nada', async () => {
    banco.devolucoes = [{ ...devolucaoBase(), status: 'solicitada' }];
    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateStatus('d1', 'concluida'); });

    expect(ok).toBe(false);
    expect(operacoes.filter(o => o.startsWith('update:'))).toEqual([]);
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Transição inválida: solicitada → concluida'));
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('carimba a data de aprovacao ao aprovar', async () => {
    banco.devolucoes = [{ ...devolucaoBase(), status: 'solicitada' }];
    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateStatus('d1', 'aprovada'); });

    expect(ok).toBe(true);
    expect(toastSuccess).toHaveBeenCalledWith('Status atualizado!');
  });

  it('nao anuncia status atualizado quando o RLS barra o UPDATE', async () => {
    barrado.devolucoes = true;
    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateStatus('d1', 'reposicao_enviada'); });

    expect(ok).toBe(false);
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Nada foi gravado'));
    expect(toastSuccess).not.toHaveBeenCalledWith('Status atualizado!');
  });

  it('nao gera credito quando o proprio status nao gravou', async () => {
    barrado.devolucoes = true;
    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateStatus('d1', 'credito_emitido'); });

    expect(ok).toBe(false);
    expect(operacoes).not.toContain('insert:creditos_fornecedor');
    expect(toastSuccess).not.toHaveBeenCalledWith('Crédito gerado automaticamente!');
  });

  it('recusa id que nao esta na lista carregada', async () => {
    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateStatus('inexistente', 'aprovada'); });

    expect(ok).toBe(false);
    expect(operacoes.filter(o => o.startsWith('update:'))).toEqual([]);
  });
});

describe('useDevolucoes · exclusao', () => {
  beforeEach(limpar);

  it('nao anuncia exclusao quando o RLS barra o DELETE', async () => {
    barrado.devolucoes = true;
    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.deleteDevolucao('d1'); });

    expect(ok).toBe(false);
    expect(operacoes).toContain('delete:devolucoes');
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Nada foi excluido'));
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('cancela a exclusao quando nao consegue conferir o credito da devolucao', async () => {
    erroDeContagem.creditos_fornecedor = { message: 'permission denied for table creditos_fornecedor' };
    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.deleteDevolucao('d1'); });

    expect(ok).toBe(false);
    expect(operacoes).not.toContain('delete:devolucoes');
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Exclusao cancelada'));
  });
});

describe('useDevolucoes · criar devolucao', () => {
  beforeEach(limpar);

  it('grava numero sequencial, valor somado dos itens e status solicitada', async () => {
    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes).toHaveLength(1));

    let criada: { id?: string } | null | undefined;
    await act(async () => {
      criada = await result.current.createDevolucao({
        fornecedor_id: 'f1',
        motivo: 'defeito',
        itens: [
          { descricao: 'A', quantidade: 2, valor_unitario: 10 },
          { descricao: 'B', quantidade: 1, valor_unitario: 5 },
        ],
      });
    });

    expect(operacoes).toContain('rpc:generate_sequential_number');
    const cabecalho = banco.devolucoes.find(d => d.id !== 'd1')!;
    expect(cabecalho).toMatchObject({ numero: 'DEV-2026', valor_total: 25, status: 'solicitada', tenant_id: 'org1' });
    expect(banco.devolucao_itens).toHaveLength(2);
    expect(banco.devolucao_itens[0]).toMatchObject({ valor_total: 20 });
    expect(banco.devolucao_itens[1]).toMatchObject({ valor_total: 5 });
    expect(criada?.id).toBe('devolucoes-1');
    expect(toastSuccess).toHaveBeenCalledWith('Devolução criada com sucesso!');
  });

  it('desfaz o cabecalho quando os itens nao gravam', async () => {
    erroDeInsert.devolucao_itens = { message: 'permission denied for table devolucao_itens' };
    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.devolucoes).toHaveLength(1));

    let criada: unknown;
    await act(async () => {
      criada = await result.current.createDevolucao({
        fornecedor_id: 'f1',
        motivo: 'defeito',
        itens: [{ descricao: 'A', quantidade: 1, valor_unitario: 10 }],
      });
    });

    expect(criada).toBeNull();
    expect(operacoes).toContain('insert:devolucoes');
    expect(operacoes).toContain('delete:devolucoes');
    expect(operacoes.indexOf('delete:devolucoes')).toBeGreaterThan(operacoes.indexOf('insert:devolucao_itens'));
    expect(banco.devolucoes.filter(d => d.id !== 'd1')).toHaveLength(0);
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(String(toastError.mock.calls[0][0])).toContain('permission denied');
  });
});

describe('useCreditosFornecedor · uso do credito', () => {
  beforeEach(() => {
    limpar();
    banco.creditos_fornecedor = [creditoBase()];
  });

  it('recusa valor acima do saldo sem tocar no banco', async () => {
    const { result } = renderHook(() => useCreditosFornecedor(), { wrapper });
    await waitFor(() => expect(result.current.creditos).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.utilizarCredito('c1', 250); });

    expect(ok).toBe(false);
    expect(operacoes).not.toContain('update:creditos_fornecedor');
    expect(toastError).toHaveBeenCalledWith('Saldo insuficiente');
  });

  it('quita o credito acumulando o valor utilizado e zerando o saldo', async () => {
    const { result } = renderHook(() => useCreditosFornecedor(), { wrapper });
    await waitFor(() => expect(result.current.creditos).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.utilizarCredito('c1', 100, 'p1'); });

    expect(ok).toBe(true);
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('utilizado!'));
  });

  it('nao anuncia credito utilizado quando o RLS barra o UPDATE', async () => {
    barrado.creditos_fornecedor = true;
    const { result } = renderHook(() => useCreditosFornecedor(), { wrapper });
    await waitFor(() => expect(result.current.creditos).toHaveLength(1));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.utilizarCredito('c1', 50); });

    expect(ok).toBe(false);
    expect(operacoes).toContain('update:creditos_fornecedor');
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Nada foi gravado'));
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('soma no saldo total apenas os creditos ativos', async () => {
    banco.creditos_fornecedor = [
      { ...creditoBase(), id: 'c1', saldo: 100, status: 'ativo' },
      { ...creditoBase(), id: 'c2', saldo: 50, status: 'utilizado' },
      { ...creditoBase(), id: 'c3', saldo: 25, status: 'ativo' },
    ];
    const { result } = renderHook(() => useCreditosFornecedor(), { wrapper });
    await waitFor(() => expect(result.current.creditos).toHaveLength(3));

    expect(result.current.saldoTotal).toBe(125);
  });
});

describe('useDevolucoesKPIs · indicadores', () => {
  beforeEach(limpar);

  it('separa abertas, em transito e concluidas e calcula a taxa sobre o total', async () => {
    banco.devolucoes = [
      { ...devolucaoBase(), id: 'a', status: 'rascunho', valor_total: 10 },
      { ...devolucaoBase(), id: 'b', status: 'em_transito', valor_total: 20 },
      { ...devolucaoBase(), id: 'c', status: 'concluida', valor_total: 30 },
      { ...devolucaoBase(), id: 'd', status: 'concluida', valor_total: 40 },
    ];
    const { result } = renderHook(() => useDevolucoesKPIs(), { wrapper });
    await waitFor(() => expect(result.current.kpis.total).toBe(4));

    expect(result.current.kpis).toMatchObject({
      total: 4,
      abertas: 1,
      emTransito: 1,
      concluidas: 2,
      valorTotal: 100,
      taxaDevolucao: 50,
    });
  });
});