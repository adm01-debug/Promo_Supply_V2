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

vi.mock('@/features/empresas/hooks/useEmpresaFilter', () => ({
  useEmpresaFilter: () => ({ empresaIds: null, queryKeyPart: 'all' }),
}));

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

    // Duas RPCs: metricas do dashboard e metricas de SLA.
    expect(rpc).toHaveBeenCalledTimes(2);
    const metricsCall = rpc.mock.calls.find(([fn]) => fn === 'get_compras_dashboard_metrics');
    const slaCall = rpc.mock.calls.find(([fn]) => fn === 'get_compras_sla_metrics');
    expect(metricsCall).toBeDefined();
    expect(slaCall).toBeDefined();
    expect(metricsCall![1].p_organization_id).toBe('org-grupo');
    expect(metricsCall![1].p_organization_id).not.toBe('tenant-filial');
    expect(slaCall![1].p_organization_id).toBe('org-grupo');
    expect(result.current.urgentItems).toHaveLength(1);
  });

  it('não chama a RPC sem organização no perfil', async () => {
    auth.organizationId = null;
    const { result } = renderHook(() => useDashboardKPIs(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('useDashboardKPIs — SLA vem da RPC, não de literal', () => {
  beforeEach(() => {
    rpc.mockReset();
    auth.organizationId = 'org-grupo';
  });

  it('usa avgSla e taxaSlaReal devolvidos por get_compras_sla_metrics', async () => {
    rpc.mockImplementation((fn: string) =>
      fn === 'get_compras_sla_metrics'
        ? Promise.resolve({
            data: {
              avgSla: 2.5,
              taxaSlaReal: 91,
              previousAvgSla: 3.5,
              previousTaxaSlaReal: 80,
              amostra: 22,
              amostraAnterior: 7,
            },
            error: null,
          })
        : Promise.resolve({ data: rpcPayload, error: null }),
    );

    const { result } = renderHook(() => useDashboardKPIs(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.avgSla).toBe(2.5);
    expect(result.current.taxaSlaReal).toBe(91);
    expect(result.current.comparisons.sla.current).toBe(91);
    expect(result.current.comparisons.sla.previous).toBe(80);
  });

  it('não derruba o dashboard quando a RPC de SLA falha', async () => {
    rpc.mockImplementation((fn: string) =>
      fn === 'get_compras_sla_metrics'
        ? Promise.resolve({ data: null, error: { message: 'boom' } })
        : Promise.resolve({ data: rpcPayload, error: null }),
    );

    const { result } = renderHook(() => useDashboardKPIs(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.avgSla).toBe(0);
    expect(result.current.taxaSlaReal).toBe(0);
    expect(result.current.urgentItems).toHaveLength(1);
  });
});

/**
 * Regressão: economiaPercentual passava por Math.round antes de o card formatar
 * com 1 casa → R$ 873,60 de economia sobre R$ 296.205 de volume (grupo real,
 * período '1y') aparecia "0.0%".
 */
describe('useDashboardKPIs — economia percentual sem arredondar', () => {
  beforeEach(() => {
    rpc.mockReset();
    auth.organizationId = 'org-grupo';
  });

  it.each([
    [296205, '0.3'],
    [176035, '0.5'],
  ])('R$ 873,60 sobre volume %d → %s%%', async (volume, esperado) => {
    rpc.mockResolvedValue({
      data: {
        ...rpcPayload,
        kpis: { ...rpcPayload.kpis, volume: { current: volume, previous: 0 }, economia: { current: 873.6, previous: 0 } },
      },
      error: null,
    });
    const { result } = renderHook(() => useDashboardKPIs(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.kpis.economiaPercentual).toBeGreaterThan(0);
    expect(result.current.kpis.economiaPercentual.toFixed(1)).toBe(esperado);
  });

  it('volume zero → 0 (sem divisão por zero)', async () => {
    rpc.mockResolvedValue({ data: { ...rpcPayload, kpis: { ...rpcPayload.kpis, economia: { current: 873.6, previous: 0 } } }, error: null });
    const { result } = renderHook(() => useDashboardKPIs(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.kpis.economiaPercentual).toBe(0);
  });
});
