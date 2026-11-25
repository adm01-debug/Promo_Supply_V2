import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Regressao: o SourcingHistoryConsole (1.324 linhas, console de sourcing com exportacao de dossie,
// benchmark por categoria, previsao de recompra e auditoria) ficou orfao - nenhum arquivo o
// importava, entao nada dele era alcancavel pela UI. A tela /historico-compras e onde ele vive,
// mas nao havia aba que o montasse (a aba Analytics so exibia o aviso de previsoes em desenvolvimento).

vi.mock('@/hooks/usePurchaseHistory', () => ({
  usePurchaseHistory: () => ({ purchaseRecords: [], productsHistory: [], suppliersHistory: [], productCategories: [], isLoading: false }),
}));
vi.mock('@/hooks/useGlobalUndo', () => ({ useGlobalUndo: () => ({ undo: vi.fn(), canUndo: () => false }) }));
vi.mock('@/hooks/useAccountFilters', () => ({
  useAccountFilters: (_key: string, defaults: Record<string, unknown>) => ({ filters: defaults, patchFilters: vi.fn(), clearFilters: vi.fn(), loading: false }),
}));
vi.mock('@/hooks/useClearFiltersFlow', () => ({ useClearFiltersFlow: () => ({ requestClear: vi.fn(), ConfirmDialog: null }) }));
vi.mock('@/components/compras/SourcingHistoryConsole', () => ({
  SourcingHistoryConsole: () => <div data-testid="sourcing-console" />,
}));
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

describe('HistoricoCompras - aba Console de Sourcing', () => {
  it('monta o SourcingHistoryConsole quando a aba e selecionada', async () => {
    renderPage();

    const aba = screen.getByRole('tab', { name: /Console de Sourcing/i });
    expect(aba).toBeTruthy();

    fireEvent.mouseDown(aba);
    fireEvent.click(aba);

    await waitFor(() => expect(screen.getByTestId('sourcing-console')).toBeTruthy());
  });
});
