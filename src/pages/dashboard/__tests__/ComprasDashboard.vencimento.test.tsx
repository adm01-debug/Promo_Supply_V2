import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Regressão: `solicitacoes.data_necessidade` é coluna DATE ("2026-03-01"). O card de urgências
// fazia `new Date("2026-03-01").toLocaleDateString('pt-BR')`, que lê a string como UTC meia-noite
// e, no fuso do Brasil, exibia "28/02/2026" — o vencimento aparecia um dia antes.
// O vitest.config.ts fixa TZ=America/Sao_Paulo, então este teste reproduz o fuso do usuário.

const urgentItems = [
  { id: 'aaaaaaaa-0000-0000-0000-000000000001', numero: 'SOL-1', titulo: 'Canetas', status: 'pendente', data_necessidade: '2026-03-01', urgencia: 'critico' },
  { id: 'aaaaaaaa-0000-0000-0000-000000000002', numero: 'SOL-2', titulo: 'Sem data', status: 'pendente', data_necessidade: null, urgencia: 'alto' },
];

const comparacao = { current: 0, previous: 0, sparkline: [] as number[] };

vi.mock('@/hooks/useDashboardKPIs', () => ({
  useDashboardKPIs: () => ({
    kpis: {
      comparisons: { aguardando: comparacao, volume: comparacao, economia: comparacao, sla: comparacao },
      economiaPercentual: 0,
      economiaGerada: 0,
      avgSla: 0,
      charts: { monthlyTrends: [], cotacaoStatus: [], topCategories: [] },
    },
    pipeline: {},
    urgentItems,
    loading: false,
  }),
}));
vi.mock('@/hooks/useAccountFilters', () => ({
  useAccountFilters: (_k: string, defaults: Record<string, unknown>) => ({ filters: defaults, patchFilters: vi.fn(), loading: false }),
}));
vi.mock('@/stores/dashboardLayoutStore', () => ({
  useDashboardLayoutStore: () => ({ loadFromDb: vi.fn(), saveToDb: vi.fn() }),
}));
vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'eq']) chain[m] = () => chain;
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
  return { supabase: { from: () => chain } };
});
vi.mock('@/components/compras/CriticalAlertsBar', () => ({ CriticalAlertsBar: () => null }));
vi.mock('@/components/compras/PurchaseClimateWidget', () => ({ PurchaseClimateWidget: () => null }));
vi.mock('@/components/compras/EnhancedKpiCard', () => ({ EnhancedKpiCard: () => null }));
vi.mock('@/components/compras/PipelineChart', () => ({ PipelineChart: () => null }));
vi.mock('@/components/compras/TrendAnalysisCharts', () => ({ TrendAnalysisCharts: () => null }));
vi.mock('@/components/compras/SourcingIntelligenceWidget', () => ({ SourcingIntelligenceWidget: () => null }));
vi.mock('@/components/compras/DashboardInsights', () => ({ DashboardInsights: () => null }));
vi.mock('@/components/compras/UrgentItemsList', () => ({
  UrgentItemsList: ({ items }: { items: { id: string; vencimento: string }[] }) => (
    <ul>
      {items.map((i) => (
        <li key={i.id} data-testid={`venc-${i.id}`}>{i.vencimento}</li>
      ))}
    </ul>
  ),
}));

import ComprasDashboard from '../ComprasDashboard';

describe('ComprasDashboard — vencimento das urgências', () => {
  it('roda no fuso do Brasil (pré-condição do teste)', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Sao_Paulo');
  });

  it('data_necessidade "2026-03-01" aparece como 01/03/2026, não 28/02/2026', async () => {
    // act assíncrono: deixa os painéis lazy resolverem antes das asserções.
    await act(async () => {
      render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <MemoryRouter>
            <ComprasDashboard />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    expect(screen.getByTestId('venc-SOL-1').textContent).toBe('01/03/2026');
    expect(screen.getByTestId('venc-SOL-2').textContent).toBe('TBD');
  });
});
