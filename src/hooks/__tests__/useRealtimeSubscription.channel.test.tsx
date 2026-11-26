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
  useAuth: () => ({ tenantId: authState.tenantId, organizationId: authState.organizationId }),
}));

const authState = vi.hoisted(() => ({
  tenantId: 'tenant-1' as string | null,
  organizationId: undefined as string | undefined,
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const canalOn = vi.hoisted(() => ({ calls: [] as unknown[][] }));

const abrirCanalPostgres = vi.fn((_nome: string) => {
  const canal: Record<string, unknown> = {};
  canal.on = (...args: unknown[]) => {
    canalOn.calls.push(args);
    return canal;
  };
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
    canalOn.calls.length = 0;
    authState.tenantId = 'tenant-1';
    authState.organizationId = undefined;
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

// HK-11 (etapa 200): `tenantId` vem do claim `tenant_id` do JWT, que nada no repositorio
// cria -- em producao `current_tenant_id()` so devolve valor com esse claim. Sem ele, este
// gate abandonava a inscricao de TODA tabela com `tenant_id` e o tempo real nunca ligava.
describe('useRealtimeSubscription - fallback de empresa (HK-11)', () => {
  beforeEach(() => {
    abrirCanalPostgres.mockClear();
    removeChannel.mockClear();
    canalOn.calls.length = 0;
    authState.tenantId = 'tenant-1';
    authState.organizationId = undefined;
  });

  it('assina filtrando pela empresa quando o claim tenant_id nao vem no JWT', () => {
    authState.tenantId = null;
    authState.organizationId = 'org-1';

    renderHook(() => useRealtimeSubscription({ tables: ['pedidos'] }), { wrapper });

    expect(abrirCanalPostgres).toHaveBeenCalledTimes(1);
    expect(abrirCanalPostgres.mock.calls[0][0]).toContain('realtime-org-1');

    const filtros = canalOn.calls.map((args) => (args[1] as { filter?: string })?.filter);
    expect(filtros).toContain('tenant_id=eq.org-1');
  });

  it('continua sem assinar quando nao ha claim nem empresa (isolamento preservado)', () => {
    authState.tenantId = null;
    authState.organizationId = undefined;

    renderHook(() => useRealtimeSubscription({ tables: ['pedidos'] }), { wrapper });

    expect(abrirCanalPostgres).not.toHaveBeenCalled();
  });

  it('prefere o tenant do claim quando ele existe, mesmo com empresa definida', () => {
    authState.tenantId = 'tenant-1';
    authState.organizationId = 'org-1';

    renderHook(() => useRealtimeSubscription({ tables: ['pedidos'] }), { wrapper });

    const filtros = canalOn.calls.map((args) => (args[1] as { filter?: string })?.filter);
    expect(filtros).toContain('tenant_id=eq.tenant-1');
  });
});