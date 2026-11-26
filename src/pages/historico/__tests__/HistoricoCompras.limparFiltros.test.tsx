import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Regressao: em HistoricoCompras o `describeActiveFilters` era `() => []`. A lista serve para
// duas coisas no `useClearFiltersFlow`: montar o dialogo e decidir se ha algo a limpar. Com a
// lista vazia, `requestClear` fazia early-return ("Nenhum filtro ativo") e o botao "Limpar
// filtros" da tela nunca limpava nada.

const captured = vi.hoisted(() => ({
  opts: null as null | { describeActiveFilters: () => Array<{ key: string; label: string; value: unknown }> },
}));

vi.mock('@/hooks/usePurchaseHistory', () => ({
  usePurchaseHistory: () => ({ purchaseRecords: [], productsHistory: [], suppliersHistory: [], productCategories: [], isLoading: false }),
}));
vi.mock('@/hooks/useGlobalUndo', () => ({ useGlobalUndo: () => ({ undo: vi.fn(), canUndo: () => false }) }));
vi.mock('@/hooks/useAccountFilters', () => ({
  useAccountFilters: (_key: string, defaults: Record<string, unknown>) => ({ filters: defaults, patchFilters: vi.fn(), clearFilters: vi.fn(), loading: false }),
}));
vi.mock('@/hooks/useClearFiltersFlow', () => ({
  useClearFiltersFlow: (opts: typeof captured.opts) => {
    captured.opts = opts;
    return { requestClear: vi.fn(), ConfirmDialog: null };
  },
}));
vi.mock('@/components/compras/SourcingHistoryConsole', () => ({ SourcingHistoryConsole: () => null }));
vi.mock('@/components/compras/SupplierIntelligenceConsole', () => ({ SupplierIntelligenceConsole: () => null }));
vi.mock('@/pages/historico/HistoricoSourcingTab', () => ({ HistoricoSourcingTab: () => null }));
vi.mock('@/pages/historico/HistoricoProdutosTab', () => ({ HistoricoProdutosTab: () => null }));
vi.mock('@/pages/historico/HistoricoFornecedoresTab', () => ({ HistoricoFornecedoresTab: () => null }));
vi.mock('@/pages/historico/HistoricoRegistrosTab', () => ({ HistoricoRegistrosTab: () => null }));
vi.mock('@/pages/historico/HistoricoDrilldownModal', () => ({ HistoricoDrilldownModal: () => null }));

import HistoricoCompras from '@/pages/historico/HistoricoCompras';

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HistoricoCompras />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const describeNow = () => {
  expect(captured.opts).not.toBeNull();
  return captured.opts!.describeActiveFilters();
};

describe('HistoricoCompras - Limpar filtros', () => {
  it('descreve o filtro de busca ativo (o botao deixa de responder "Nenhum filtro ativo")', () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Buscar por produto/i), { target: { value: 'parafuso' } });

    const fields = describeNow();
    expect(fields.length).toBeGreaterThan(0);
    expect(fields).toContainEqual(expect.objectContaining({ key: 'searchTerm', value: 'parafuso' }));
  });

  it('nao inventa filtro ativo quando tudo esta no padrao', () => {
    renderPage();

    const fields = describeNow();
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f.value]));
    expect(byKey.searchTerm).toBe('');
    expect(byKey.categoryFilter).toBe('all');
    expect(byKey.statusFilter).toBe('all');
    expect(byKey.periodPreset).toBe('all');
    expect(byKey.dateRange).toBeUndefined();
  });
});