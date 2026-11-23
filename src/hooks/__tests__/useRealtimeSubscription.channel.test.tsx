import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRealtimeSubscription } from '../useRealtimeSubscription';

// Etapa QA 080 (HK-02): o efeito tinha `tables` nas dependencias e quase todo
// consumidor passa um literal (`tables={['fornecedores']}`), isto e, um array novo
// a cada render. Resultado: o canal era removido e reinscrito em toda renderizacao
// e os eventos que chegassem nesse intervalo eram perdidos.

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuth: () => ({ tenantId: 'tenant-1' }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const abrirCanalPostgres = vi.fn((_nome: string) => {
  const canal: Record<string, unknown> = {};
  canal.on = () => canal;
  canal.subscribe = () => canal;
  return canal;
});

vi.mock('@/lib/realtime', () => ({
  abrirCanalPostgres: (nome: string) => abrirCanalPostgres(nome),
}));

const removeChannel = vi.fn((_canal: unknown) => Promise.resolve('ok'));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { removeChannel: (c: unknown) => removeChannel(c) },
}));

// Instancia unica: um QueryClient novo a cada render do wrapper recriaria o
// flushInvalidations e mascararia o que este teste quer provar.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useRealtimeSubscription (HK-02)', () => {
  beforeEach(() => {
    abrirCanalPostgres.mockClear();
    removeChannel.mockClear();
  });

  it('nao reinscreve o canal quando o consumidor repassa um array novo com o mesmo conteudo', () => {
    const { rerender } = renderHook(
      ({ tabelas }: { tabelas: 'fornecedores'[] }) =>
        useRealtimeSubscription({ tables: tabelas, queryKeysToInvalidate: [['fornecedores']] }),
      { wrapper, initialProps: { tabelas: ['fornecedores'] as 'fornecedores'[] } }
    );

    expect(abrirCanalPostgres).toHaveBeenCalledTimes(1);

    rerender({ tabelas: ['fornecedores'] as 'fornecedores'[] });
    rerender({ tabelas: ['fornecedores'] as 'fornecedores'[] });

    expect(abrirCanalPostgres).toHaveBeenCalledTimes(1);
    expect(removeChannel).not.toHaveBeenCalled();
  });

  it('reinscreve quando a lista de tabelas muda de verdade', () => {
    const { rerender } = renderHook(
      ({ tabelas }: { tabelas: ('fornecedores' | 'pedidos')[] }) =>
        useRealtimeSubscription({ tables: tabelas }),
      { wrapper, initialProps: { tabelas: ['fornecedores'] as ('fornecedores' | 'pedidos')[] } }
    );

    expect(abrirCanalPostgres).toHaveBeenCalledTimes(1);

    rerender({ tabelas: ['fornecedores', 'pedidos'] });

    expect(abrirCanalPostgres).toHaveBeenCalledTimes(2);
  });
});