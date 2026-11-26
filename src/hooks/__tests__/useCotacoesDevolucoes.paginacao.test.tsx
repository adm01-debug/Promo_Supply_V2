import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDevolucoes } from '../useDevolucoes';
import { useCotacoes } from '@/features/cotacoes/hooks/useCotacoes';

// Etapa QA 212 (PERF-01 parte 2/2): `useCotacoes` e `useDevolucoes` tambem
// baixavam a tabela inteira, sem `.range`. A paginacao entrou opt-in por `page`
// para nao tirar linhas de Cotacao.tsx / GerarOrdem.tsx, que leem a lista cheia.

type Chamada = { tabela: string; nome: string; args: unknown[] };
let chamadas: Chamada[] = [];
let resposta: { data: unknown[]; count: number | null } = { data: [], count: null };

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, organizationId: 'org1', tenantId: 'org1' }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/hooks/useRealtimeSubscription', () => ({
  useRealtimeSubscription: () => undefined,
}));

vi.mock('@/services/auditService', () => ({
  auditHelpers: {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logDelete: vi.fn(),
    logStatusChange: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => {
  const supabase = {
    from: (tabela: string) => {
      const builder: Record<string, unknown> = {};
      const encadear = (nome: string) => (...args: unknown[]) => {
        chamadas.push({ tabela, nome, args });
        return builder;
      };
      builder.select = encadear('select');
      builder.order = encadear('order');
      builder.eq = encadear('eq');
      builder.in = encadear('in');
      builder.or = encadear('or');
      builder.range = encadear('range');
      builder.then = (resolve: (v: unknown) => unknown) =>
        resolve({ data: resposta.data, count: resposta.count, error: null });
      return builder;
    },
  };
  return { supabase };
});

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const daTabela = (tabela: string, nome: string) =>
  chamadas.find((c) => c.tabela === tabela && c.nome === nome);

describe('useDevolucoes · paginacao (PERF-01 / etapa 212)', () => {
  beforeEach(() => {
    chamadas = [];
    resposta = { data: [], count: null };
  });

  it('sem `page` nao pagina nem pede contagem', async () => {
    resposta = { data: [{ id: 'd1', fornecedor_id: null, pedido_id: null }], count: 1 };

    const { result } = renderHook(() => useDevolucoes(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(daTabela('devolucoes', 'range')).toBeUndefined();
    expect(daTabela('devolucoes', 'select')?.args[1]).toEqual({});
    expect(result.current.devolucoes).toHaveLength(1);
  });

  it('com `page` aplica .range e le a contagem exata', async () => {
    resposta = { data: [{ id: 'd21', fornecedor_id: null, pedido_id: null }], count: 57 };

    const { result } = renderHook(() => useDevolucoes({ page: 2, pageSize: 20 }), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(daTabela('devolucoes', 'range')?.args).toEqual([20, 39]);
    expect(daTabela('devolucoes', 'select')?.args[1]).toEqual({ count: 'exact' });
    expect(result.current.totalCount).toBe(57);
    expect(result.current.devolucoes).toHaveLength(1);
  });
});

describe('useCotacoes · paginacao (PERF-01 / etapa 212)', () => {
  beforeEach(() => {
    chamadas = [];
    resposta = { data: [], count: null };
  });

  it('sem `page` mantem a lista completa de Cotacao/GerarOrdem', async () => {
    resposta = { data: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }], count: 3 };

    const { result } = renderHook(() => useCotacoes({ solicitacao_id: 's1' }), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(daTabela('cotacoes', 'range')).toBeUndefined();
    expect(result.current.cotacoes).toHaveLength(3);
  });

  it('com `page` aplica .range preservando o filtro de solicitacao', async () => {
    resposta = { data: [{ id: 'c41' }], count: 61 };

    const { result } = renderHook(
      () => useCotacoes({ solicitacao_id: 's1', page: 3, pageSize: 20 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(daTabela('cotacoes', 'range')?.args).toEqual([40, 59]);
    expect(result.current.totalCount).toBe(61);
    const eqs = chamadas.filter((c) => c.nome === 'eq').map((c) => c.args[0]);
    expect(eqs).toContain('solicitacao_id');
  });
});
