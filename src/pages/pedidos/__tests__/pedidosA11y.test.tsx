import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Pedidos from "@/pages/pedidos/Pedidos";

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/empresas/hooks/useEmpresaFilter", () => ({
  useEmpresaFilter: () => ({ empresaIds: [] }),
}));

vi.mock("@/hooks/useFornecedores", () => ({
  useFornecedores: () => ({ fornecedores: [] }),
}));

vi.mock("@/features/pedidos", () => ({
  usePedidos: () => ({
    pedidos: [
      {
        id: "P-1",
        numero: "PO-0001",
        status: "aprovado",
        data_emissao: "2026-01-05T10:00:00.000Z",
        data_previsao: "2026-02-05T10:00:00.000Z",
        valor_total: 1500.5,
        fornecedor: { razao_social: "Fornecedor Beta" },
      },
    ],
    loading: false,
    refetch: vi.fn(),
    bulkUpdateStatus: vi.fn(),
    bulkDelete: vi.fn(),
  }),
  usePedidosKPIs: () => ({ kpis: {} }),
}));

vi.mock("@/components/compras/EnhancedBulkActionsBar", () => ({
  EnhancedBulkActionsBar: () => null,
  defaultBulkActions: [],
}));

vi.mock("@/pages/pedidos/PedidoDetailsDialog", () => ({
  PedidoDetailsDialog: ({ open, pedido }: { open: boolean; pedido: { numero: string } | null }) =>
    open ? <div data-testid="detalhes">{pedido?.numero}</div> : null,
}));

const renderPedidos = () =>
  render(
    <MemoryRouter>
      <Pedidos />
    </MemoryRouter>,
  );

describe("Pedidos - a\u00e7\u00e3o de linha acess\u00edvel por teclado", () => {
  it("nomeia o bot\u00e3o s\u00f3-\u00edcone da linha com o pedido que ele abre", () => {
    renderPedidos();

    expect(screen.getByRole("button", { name: "Ver pedido PO-0001" })).toBeInTheDocument();
  });

  it("abre o detalhe do pedido ao clicar no bot\u00e3o da linha", () => {
    renderPedidos();

    expect(screen.queryByTestId("detalhes")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver pedido PO-0001" }));

    expect(screen.getByTestId("detalhes")).toHaveTextContent("PO-0001");
  });

  it("preserva o clique na linha inteira para quem usa mouse", () => {
    renderPedidos();

    const linha = screen.getByText("#PO-0001").closest("tr");
    expect(linha).not.toBeNull();
    fireEvent.click(linha!);

    expect(screen.getByTestId("detalhes")).toHaveTextContent("PO-0001");
  });
});
