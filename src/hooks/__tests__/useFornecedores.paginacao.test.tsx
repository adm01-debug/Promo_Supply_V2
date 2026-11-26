import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFornecedores } from '../useFornecedores';

// Etapa QA 211 (PERF-01): `useFornecedores` devolvia sempre a tabela inteira.
// A paginação passou a ser opt-in por `page` para não quebrar os seletores e
// sugestões que chamam o hook sem filtros (Cotacao, Pedidos, Licitacoes...).

const ORG = 'df60b900-ede4-45db-8573-da40d13bf767';
const TENANT = '39838251-a1d7-4437-b47a-7329efe8f68f';

type Chamada = { nome: string; args: unknown[] };
let chamadas: Chamada[] = [];
let resposta: { data: unknown[]; count: number | null } = { data: [], count: null };

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, organizationId: ORG, tenantId: TENANT }),
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

vi.mock('@/integrations/supabase/client', () => {
  const supabase = {
    from: () => {
      const builder: Record<string, unknown> = {};
      const encadear = (nome: string) => (...args: unknown[]) => {
        chamadas.push({ nome, args });
        return builder;
      };
      builder.select = encadear('select');
      builder.order = encadear('order');
      builder.eq = encadear('eq');
      builder.not = encadear('not');
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

const achar = (nome: string) => chamadas.find((c) => c.nome === nome);

describe('useFornecedores · paginacao (PERF-01 / etapa 211)', () => {
  beforeEach(() => {
    chamadas = [];
    resposta = { data: [], count: null };
  });

  it('sem `page` nao pagina: mantem a lista inteira para os seletores', async () => {
    resposta = { data: [{ id: 'f1' }, { id: 'f2' }], count: 2 };

    const { result } = renderHook(() => useFornecedores(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(achar('range')).toBeUndefined();
    expect(achar('select')?.args[1]).toEqual({});
    expect(result.current.fornecedores).toHaveLength(2);
  });

  it('com `page` aplica .range e pede a contagem exata do servidor', async () => {
    resposta = { data: [{ id: 'f21' }], count: 145 };

    const { result } = renderHook(() => useFornecedores({ page: 2, pageSize: 20 }), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(achar('range')?.args).toEqual([20, 39]);
    expect(achar('select')?.args[1]).toEqual({ count: 'exact' });
    expect(result.current.totalCount).toBe(145);
    expect(result.current.fornecedores).toHaveLength(1);
  });

  it('tipo `nacional` vira o "resto" (nao internacional nem local), como na tela', async () => {
    const { result } = renderHook(() => useFornecedores({ tipo: 'nacional' }), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(achar('not')?.args).toEqual(['tipo', 'in', '(internacional,local)']);
    expect(achar('eq')?.args).toEqual(['organization_id', ORG]);
  });

  it('tipos exatos seguem por igualdade direta', async () => {
    const { result } = renderHook(() => useFornecedores({ tipo: 'local' }), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(achar('not')).toBeUndefined();
    const eqs = chamadas.filter((c) => c.nome === 'eq').map((c) => c.args[0]);
    expect(eqs).toContain('tipo');
  });
});
