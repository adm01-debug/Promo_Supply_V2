import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  PedidoDetailsDialog: () => null,
}));

describe("Pedidos - nome acess\u00edvel da a\u00e7\u00e3o de linha", () => {
  it("nomeia o bot\u00e3o s\u00f3-\u00edcone de a\u00e7\u00f5es da linha", () => {
    render(
      <MemoryRouter>
        <Pedidos />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "A\u00e7\u00f5es do pedido" })).toBeInTheDocument();
  });
});
