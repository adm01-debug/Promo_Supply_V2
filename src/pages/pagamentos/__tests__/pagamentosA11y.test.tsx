import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Pagamentos from "../Pagamentos";

const { pagamentos } = vi.hoisted(() => ({
  pagamentos: [{
    id: "pag-1",
    numero: "PAG-0001",
    status: "pendente",
    valor: 1500.5,
    data_vencimento: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    numero_nf: "NF-77",
    fornecedor: { id: "f1", razao_social: "Fornecedor Teste" },
  }],
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
    kpis: { total: 1, pendentes: 1, atrasados: 0, pagos: 0, valorPendente: 1500.5, valorPago: 0 },
    isLoading: false,
  }),
}));

vi.mock("@/features/empresas/hooks/useEmpresaFilter", () => ({
  useEmpresaFilter: () => ({ empresaIds: [] }),
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

vi.mock("@/components/pagamentos/PagamentoDetailModal", () => ({
  PagamentoDetailModal: ({ open, pagamento }: { open: boolean; pagamento: { id: string } | null }) =>
    open ? <div>{`detalhe-aberto:${pagamento?.id}`}</div> : null,
}));
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

const botaoDaLinha = () => screen.getByRole("button", { name: /Abrir pagamento PAG-0001/i });

describe("Pagamentos - detalhe do pagamento acessivel pelo teclado (etapa 235)", () => {
  it("a linha ganha um controle nomeado, focavel e nativo (Enter/espaco sao do navegador)", () => {
    renderPagina();
    const botao = botaoDaLinha();
    expect(botao.tagName).toBe("BUTTON");
    botao.focus();
    expect(document.activeElement).toBe(botao);
  });

  it("o acionamento do controle abre o detalhe do pagamento", async () => {
    renderPagina();
    fireEvent.click(botaoDaLinha());
    expect(await screen.findByText("detalhe-aberto:pag-1")).toBeInTheDocument();
  });

  it("o clique no controle abre o detalhe uma unica vez", async () => {
    renderPagina();
    fireEvent.click(botaoDaLinha());
    expect(await screen.findByText("detalhe-aberto:pag-1")).toBeInTheDocument();
  });

  it("o clique na linha continua abrindo o detalhe (mouse preservado)", async () => {
    renderPagina();
    fireEvent.click(screen.getByText("PAG-0001"));
    expect(await screen.findByText("detalhe-aberto:pag-1")).toBeInTheDocument();
  });
});
