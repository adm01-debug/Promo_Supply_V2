import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSpotProducts } from '../useSpotCatalog';

// Etapa QA 060 (SEC-10): o termo de busca do catalogo SPOT era interpolado cru
// dentro de `.or()` do PostgREST. `,` `(` `)` sao delimitadores estruturais do
// filtro, entao o texto digitado podia fechar o grupo e acrescentar condicoes a
// consulta. Os outros 8 filtros de busca do app ja usavam escapeIlike.

const { orArgs } = vi.hoisted(() => ({ orArgs: [] as string[] }));

vi.mock('@/integrations/supabase/client', () => {
  const builder = () => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'order', 'limit', 'contains']) q[m] = () => q;
    q.or = (arg: string) => {
      orArgs.push(arg);
      return q;
    };
    q.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
    return q;
  };
  return { supabase: { from: () => builder() } };
});

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const montar = (search: string) =>
  renderHook(
    () => useSpotProducts({ search, collection: null, typeCodes: null }),
    { wrapper },
  );

describe('useSpotProducts / filtro de busca (SEC-10)', () => {
  beforeEach(() => { orArgs.length = 0; });

  it('busca comum sai com o termo literal nas duas colunas', async () => {
    montar('copo');
    await waitFor(() => expect(orArgs).toHaveLength(1));
    expect(orArgs[0]).toBe('name.ilike.%copo%,reference.ilike.%copo%');
  });

  it('nao deixa `,` `(` `)` `*` do termo virarem estrutura do filtro or', async () => {
    montar('a),reference.ilike.*');
    await waitFor(() => expect(orArgs).toHaveLength(1));
    expect(orArgs[0]).toBe(
      'name.ilike.%a\\)\\,reference.ilike.\\*%,reference.ilike.%a\\)\\,reference.ilike.\\*%',
    );
  });

  it('busca em branco nao acrescenta clausula', async () => {
    const { result } = montar('   ');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(orArgs).toHaveLength(0);
  });
});
