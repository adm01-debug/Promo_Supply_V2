import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Pedidos from "@/pages/pedidos/Pedidos";

const estado = vi.hoisted(() => ({
  pedidos: [] as Array<Record<string, unknown>>,
  totalCount: 0,
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
  ultimaChamada: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// array estavel: no app o hook real memoiza `empresaIds`, e uma identidade nova
// a cada render faria o efeito de reset de pagina disparar sempre.
const empresaIdsVazio: string[] = [];

vi.mock("@/features/empresas/hooks/useEmpresaFilter", () => ({
  useEmpresaFilter: () => ({ empresaIds: empresaIdsVazio }),
}));

vi.mock("@/hooks/useFornecedores", () => ({
  useFornecedores: () => ({ fornecedores: [] }),
}));

vi.mock("@/features/pedidos", () => ({
  usePedidos: (filtros: Record<string, unknown>) => {
    estado.ultimaChamada = filtros;
    return {
      pedidos: estado.pedidos,
      totalCount: estado.totalCount,
      loading: estado.loading,
      error: estado.error,
      refetch: estado.refetch,
      bulkUpdateStatus: vi.fn(),
      bulkDelete: vi.fn(),
    };
  },
  usePedidosKPIs: () => ({ kpis: {} }),
}));

vi.mock("@/components/compras/EnhancedBulkActionsBar", () => ({
  EnhancedBulkActionsBar: () => null,
  defaultBulkActions: [],
}));

vi.mock("@/pages/pedidos/PedidoDetailsDialog", () => ({
  PedidoDetailsDialog: () => null,
}));

const pedido = {
  id: "P-1",
  numero: "PO-0001",
  status: "aprovado",
  data_emissao: "2026-01-05T10:00:00.000Z",
  data_previsao: "2026-02-05T10:00:00.000Z",
  valor_total: 1500.5,
  fornecedor: { razao_social: "Fornecedor Beta" },
};

const renderPedidos = () =>
  render(
    <MemoryRouter>
      <Pedidos />
    </MemoryRouter>,
  );

beforeEach(() => {
  estado.pedidos = [pedido];
  estado.totalCount = 1;
  estado.loading = false;
  estado.error = null;
  estado.refetch = vi.fn();
  estado.ultimaChamada = undefined;
});

describe("Pedidos - falha de carga nao vira lista vazia (QA 250)", () => {
  it("mostra o erro da consulta e o botao de nova tentativa no lugar da lista", () => {
    estado.error = "permission denied for table pedidos";
    renderPedidos();

    expect(screen.getByText(/carregar os pedidos/i)).toBeInTheDocument();
    expect(screen.getByText("permission denied for table pedidos")).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum pedido/i)).not.toBeInTheDocument();
    expect(screen.queryByText("#PO-0001")).not.toBeInTheDocument();
  });

  it("o botao de nova tentativa chama o refetch do hook", () => {
    estado.error = "timeout";
    renderPedidos();

    fireEvent.click(screen.getByRole("button", { name: /Tentar de novo/i }));

    expect(estado.refetch).toHaveBeenCalledTimes(1);
  });

  it("sem erro a lista renderiza normalmente", () => {
    renderPedidos();

    expect(screen.getByText("#PO-0001")).toBeInTheDocument();
    expect(screen.queryByText(/carregar os pedidos/i)).not.toBeInTheDocument();
  });
});

describe("Pedidos - contagem e pagina refletem o total do banco (QA 250)", () => {
  it("o badge para de anunciar so a fatia carregada quando ha mais paginas", () => {
    estado.totalCount = 137;
    renderPedidos();

    expect(screen.getByText("1 de 137 Pedidos Ativos")).toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1 de 137 pedidos/i)).toBeInTheDocument();
  });

  it("a primeira pagina desabilita o botao Anterior", () => {
    estado.totalCount = 137;
    renderPedidos();

    expect(screen.getByRole("button", { name: /^Anterior$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Pr\u00f3xima$/i })).toBeEnabled();
  });

  it("avancar de pagina pede a pagina 1 ao hook", () => {
    estado.totalCount = 137;
    renderPedidos();

    expect(estado.ultimaChamada).toMatchObject({ page: 0, pageSize: 50 });

    fireEvent.click(screen.getByRole("button", { name: /^Pr\u00f3xima$/i }));

    expect(estado.ultimaChamada).toMatchObject({ page: 1, pageSize: 50 });
  });

  it("quando tudo cabe numa pagina nao aparece paginador", () => {
    estado.totalCount = 1;
    renderPedidos();

    expect(screen.queryByRole("button", { name: /^Pr\u00f3xima$/i })).not.toBeInTheDocument();
  });
});