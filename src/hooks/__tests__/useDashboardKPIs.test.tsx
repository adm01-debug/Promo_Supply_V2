import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regressão: get_compras_dashboard_metrics filtra solicitações por
 * organization_id (= grupo, profiles.current_organization_id). O hook passava
 * o tenantId — nenhuma solicitação tem organization_id = tenant, e a função
 * passou a responder 'forbidden' para organização que não é a do chamador.
 */

const rpc = vi.fn();
const auth = {
  organizationId: 'org-grupo' as string | null,
  tenantId: 'tenant-filial',
  user: { id: 'u1' },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

vi.mock('@/features/auth', () => ({ useAuth: () => auth }));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { useDashboardKPIs } from '../useDashboardKPIs';

const rpcPayload = {
  kpis: {
    aguardando: { current: 4, previous: 0 },
    volume: { current: 0, previous: 0 },
    economia: { current: 0, previous: 0 },
  },
  pipeline: { solicitacao: 4, cotacao: 4, pedido: 9, pagamento: 1, transito: 1, entregue: 24 },
  urgentItems: [{ id: 's1', status: 'pendente', data_necessidade: null }],
  trends: [],
  cotacaoStatus: [],
  topCategories: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useDashboardKPIs — parâmetro da organização', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: rpcPayload, error: null });
    auth.organizationId = 'org-grupo';
  });

  it('envia organizationId (grupo) como p_organization_id, nunca o tenantId', async () => {
    const { result } = renderHook(() => useDashboardKPIs(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(rpc).toHaveBeenCalledTimes(1);
    const [fn, params] = rpc.mock.calls[0];
    expect(fn).toBe('get_compras_dashboard_metrics');
    expect(params.p_organization_id).toBe('org-grupo');
    expect(params.p_organization_id).not.toBe('tenant-filial');
    expect(result.current.urgentItems).toHaveLength(1);
  });

  it('não chama a RPC sem organização no perfil', async () => {
    auth.organizationId = null;
    const { result } = renderHook(() => useDashboardKPIs(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(rpc).not.toHaveBeenCalled();
  });
});
