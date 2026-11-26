import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Pagamentos from "../Pagamentos";

// Fixtures dos dois status que ficavam sem tratamento na tela: 'atrasado' caia no
// fallback PENDENTE e 'cancelado' nao aparecia em nenhuma das duas abas.
const { pagamentos } = vi.hoisted(() => ({
  pagamentos: [
    {
      id: "pag-atrasado",
      numero: "PAG-ATRASADO",
      status: "atrasado",
      valor: 900,
      data_vencimento: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      numero_nf: "NF-90",
      fornecedor: { id: "f1", razao_social: "Fornecedor Atrasado" },
    },
    {
      id: "pag-cancelado",
      numero: "PAG-CANCELADO",
      status: "cancelado",
      valor: 400,
      data_vencimento: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      numero_nf: "NF-40",
      fornecedor: { id: "f2", razao_social: "Fornecedor Cancelado" },
    },
  ],
}));

vi.mock("@/hooks/usePagamentos", () => ({
  usePagamentos: () => ({
    pagamentos,
    totalCount: pagamentos.length,
    loading: false,
    error: null,
    refetch: vi.fn(),
    markAsPaid: vi.fn(),
    approvePagamento: vi.fn(),
    bulkUpdateStatus: vi.fn(),
  }),
  usePagamentosKPIs: () => ({
    kpis: { total: 2, pendentes: 1, atrasados: 1, pagos: 0, valorPendente: 900, valorPago: 0 },
    isLoading: false,
  }),
}));

vi.mock("@/features/empresas/hooks/useEmpresaFilter", () => ({
  useEmpresaFilter: () => ({ empresaIds: [] }),
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/pagamentos/PagamentoDetailModal", () => ({ PagamentoDetailModal: () => null }));
vi.mock("@/components/pagamentos/PagamentoAdvancedKPIs", () => ({ PagamentoAdvancedKPIs: () => null }));
vi.mock("@/components/pagamentos/PagamentoFinancialDashboard", () => ({ PagamentoFinancialDashboard: () => null }));
vi.mock("@/components/pagamentos/PagamentoScheduleModal", () => ({ PagamentoScheduleModal: () => null }));
vi.mock("@/components/pagamentos/PagamentoNotificationsWidget", () => ({ PagamentoNotificationsWidget: () => null }));
vi.mock("@/components/pagamentos/PagamentoExportPanel", () => ({ PagamentoExportPanel: () => null }));
vi.mock("@/components/pagamentos/PagamentoMobileCard", () => ({ PagamentoMobileCard: () => null }));

const renderPagina = () =>
  render(
    <MemoryRouter>
      <Pagamentos />
    </MemoryRouter>,
  );

describe("Pagamentos - os 7 status do CHECK aparecem na tela (J7-16 e J7-17)", () => {
  it("pagamento 'atrasado' ganha badge ATRASADO em vez do fallback PENDENTE", () => {
    renderPagina();

    expect(screen.getByText("PAG-ATRASADO")).toBeInTheDocument();
    expect(screen.getByText("ATRASADO")).toBeInTheDocument();
    expect(screen.queryByText("PENDENTE")).toBeNull();
  });

  it("pagamento 'cancelado' nao aparece na aba EM ABERTO", () => {
    renderPagina();

    expect(screen.queryByText("PAG-CANCELADO")).toBeNull();
  });

  it("a aba CANCELADOS lista o pagamento cancelado com o badge CANCELADO", () => {
    renderPagina();

    fireEvent.mouseDown(screen.getByRole("tab", { name: /CANCELADOS \(1\)/i }));

    expect(screen.getByText("PAG-CANCELADO")).toBeInTheDocument();
    // o badge do status usa bg-muted; a coluna de vencimento repete o rotulo (mesmo padrao do PAGO)
    const badge = screen.getAllByText("CANCELADO").find((el) => el.className.includes("bg-muted"));
    expect(badge).toBeDefined();
    expect(screen.queryByText("PAG-ATRASADO")).toBeNull();
  });

  it("a coluna de vencimento do cancelado nao afirma que ele esta vencido", () => {
    renderPagina();

    fireEvent.mouseDown(screen.getByRole("tab", { name: /CANCELADOS \(1\)/i }));

    expect(screen.queryByText(/VENCIDO/)).toBeNull();
  });
});