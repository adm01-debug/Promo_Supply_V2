import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const eqs: [string, unknown][] = [];

const criarBuilder = () => {
  const builder: Record<string, unknown> = {};
  const encadear = () => builder;
  builder.select = encadear;
  builder.order = builder.range = builder.or = builder.in = builder.gte = builder.lte = encadear;
  builder.eq = (coluna: string, valor: unknown) => {
    eqs.push([coluna, valor]);
    return builder;
  };
  builder.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
  return builder;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => criarBuilder()) },
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, organizationId: 'org-1' }),
}));

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/feedbackToast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/services/auditService', () => ({
  auditHelpers: { logCreate: vi.fn(), logUpdate: vi.fn(), logDelete: vi.fn(), logStatusChange: vi.fn() },
}));
vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));

import { usePedidos } from '../usePedidos';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// Etapa 213: status e fornecedor eram aplicados em JS sobre a pagina ja'
// baixada, entao escolher "Entregue" mostrava so' os entregues que coubessem
// nas 50 linhas da pagina atual.
describe('filtros de pedidos no servidor (etapa 213)', () => {
  beforeEach(() => {
    eqs.length = 0;
  });

  it('empurra status e fornecedor para a consulta', async () => {
    const { result } = renderHook(
      () => usePedidos({ status: 'entregue', fornecedor_id: 'f1' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(eqs).toContainEqual(['status', 'entregue']);
    expect(eqs).toContainEqual(['fornecedor_id', 'f1']);
    expect(eqs).toContainEqual(['organization_id', 'org-1']);
  });

  it('sem filtro nao acrescenta eq de status nem de fornecedor', async () => {
    const { result } = renderHook(() => usePedidos(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const colunas = eqs.map(([coluna]) => coluna);
    expect(colunas).not.toContain('status');
    expect(colunas).not.toContain('fornecedor_id');
  });
});

describe('a tela de pedidos manda os filtros para o hook', () => {
  const fonte = readFileSync(join(process.cwd(), 'src/pages/pedidos/Pedidos.tsx'), 'utf-8');

  it('passa status e fornecedor na chamada de usePedidos', () => {
    expect(fonte).toContain("status: statusFilter !== 'all' ? statusFilter : undefined");
    expect(fonte).toContain("fornecedor_id: fornecedorFilter !== 'all' ? fornecedorFilter : undefined");
  });
});
