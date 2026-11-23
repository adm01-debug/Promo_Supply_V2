import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePrefetch } from '../usePrefetch';

// Etapa QA 072 (HK-01): o prefetch gravava a chave de 13 posicoes com um array,
// enquanto a listagem le 14 posicoes com { data, totalCount }. A entrada ficava
// morta no cache e o hover do menu disparava 50 linhas para nada.

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, organizationId: 'org1' }),
}));

const range = vi.fn(() => Promise.resolve({ data: [{ id: 's1' }], error: null, count: 1 }));
const eq = vi.fn(() => ({ range }));
const order = vi.fn(() => ({ eq }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ order }),
    }),
  },
}));

// Mesma chave que useSolicitacoes monta sem filtro: 14 posicoes, terminando em 'all'.
const chaveDaListagem = [
  'solicitacoes', 'u1', 'org1',
  undefined, undefined, undefined, undefined,
  undefined, undefined, undefined, undefined,
  undefined, undefined, 'all',
];

// Chave antiga do prefetch: 13 posicoes, sem o 'all' final.
const chaveAntiga = [
  'solicitacoes', 'u1', 'org1',
  undefined, undefined, undefined, undefined, undefined,
  undefined, undefined, undefined, undefined, undefined,
];

describe('usePrefetch · solicitacoes (HK-01)', () => {
  it('preenche a chave que a listagem consome, com o formato { data, totalCount }', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePrefetch(), { wrapper });

    await act(async () => {
      result.current.prefetchSolicitacoes();
    });

    await waitFor(() => expect(client.getQueryData(chaveDaListagem)).toBeDefined());

    const cached = client.getQueryData(chaveDaListagem) as { data: unknown[]; totalCount: number };
    expect(Array.isArray(cached.data)).toBe(true);
    expect(cached.totalCount).toBe(1);
  });

  it('nao grava mais a chave curta de 13 posicoes', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePrefetch(), { wrapper });

    await act(async () => {
      result.current.prefetchSolicitacoes();
    });

    await waitFor(() => expect(client.getQueryData(chaveDaListagem)).toBeDefined());
    expect(client.getQueryData(chaveAntiga)).toBeUndefined();
  });
});