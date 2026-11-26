import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Pagamentos from "../Pagamentos";

// Etapa 247 (UI-12): o modal coletava a data, o toast anunciava "agendado para
// dd/MM/yyyy" e o handler chamava bulkUpdateStatus(ids, 'agendado') sem a data.
const { pagamentos, bulkUpdateStatus } = vi.hoisted(() => ({
  bulkUpdateStatus: vi.fn(async () => true),
  pagamentos: [
    {
      id: "pag-aprovado",
      numero: "PAG-APROVADO",
      status: "aprovado",
      valor: 500,
      data_vencimento: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
      numero_nf: "NF-50",
      fornecedor: { id: "f1", razao_social: "Fornecedor Aprovado" },
    },
    {
      id: "pag-agendado",
      numero: "PAG-AGENDADO",
      status: "agendado",
      valor: 700,
      data_vencimento: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
      data_agendamento: "2026-12-15",
      numero_nf: "NF-70",
      fornecedor: { id: "f2", razao_social: "Fornecedor Agendado" },
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
    markAsPaid: vi.fn(async () => true),
    approvePagamento: vi.fn(async () => true),
    bulkUpdateStatus,
  }),
  usePagamentosKPIs: () => ({
    kpis: { total: 2, pendentes: 2, atrasados: 0, pagos: 0, valorPendente: 1200, valorPago: 0 },
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
vi.mock("@/components/pagamentos/PagamentoNotificationsWidget", () => ({ PagamentoNotificationsWidget: () => null }));
vi.mock("@/components/pagamentos/PagamentoExportPanel", () => ({ PagamentoExportPanel: () => null }));
vi.mock("@/components/pagamentos/PagamentoMobileCard", () => ({ PagamentoMobileCard: () => null }));

// O modal real tem calendario; aqui interessa apenas o contrato com a pagina.
vi.mock("@/components/pagamentos/PagamentoScheduleModal", () => ({
  PagamentoScheduleModal: ({
    open,
    onSchedule,
    pagamentos: selecionados,
  }: {
    open: boolean;
    onSchedule: (ids: string[], date: string) => Promise<boolean>;
    pagamentos: Array<{ id: string }>;
  }) =>
    open ? (
      <button
        type="button"
        onClick={() => void onSchedule(selecionados.map((p) => p.id), "2026-12-15")}
      >
        CONFIRMAR-DATA
      </button>
    ) : null,
}));

const renderPagina = () =>
  render(
    <MemoryRouter>
      <Pagamentos />
    </MemoryRouter>,
  );

describe("Pagamentos - agendamento grava a data escolhida (UI-12)", () => {
  beforeEach(() => {
    bulkUpdateStatus.mockClear();
  });

  it("a data do calendario chega ao bulkUpdateStatus junto com o status agendado", async () => {
    renderPagina();

    // indices: [0] = selecionar todos, [1] = PAG-APROVADO, [2] = PAG-AGENDADO
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    fireEvent.click(screen.getByRole("button", { name: /AGENDAR 1 SELECIONADOS/i }));
    fireEvent.click(screen.getByRole("button", { name: "CONFIRMAR-DATA" }));

    await waitFor(() =>
      expect(bulkUpdateStatus).toHaveBeenCalledWith(["pag-aprovado"], "agendado", "2026-12-15"),
    );
  });

  it("a linha do pagamento agendado mostra a data gravada, nao so o rotulo", () => {
    renderPagina();

    expect(screen.getByText(/AGENDADO: 15\/12\/2026/)).toBeInTheDocument();
  });
});