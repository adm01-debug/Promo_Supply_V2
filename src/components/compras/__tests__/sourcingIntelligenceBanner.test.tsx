import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SourcingIntelligenceBanner } from "@/components/compras/ProductionRoutingEngine";

const estado = vi.hoisted(() => ({
  paresPorProduto: {} as Record<string, number>,
}));

const fetchAllRows = vi.hoisted(() => vi.fn());
vi.mock("@/lib/paginatedFetch", () => ({ fetchAllRows }));

const rota = { atual: "/pedidos" };

const RotaAtual = () => {
  const local = useLocation();
  rota.atual = local.pathname;
  return null;
};

const renderBanner = (items: Array<Record<string, unknown>>) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/pedidos"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <RotaAtual />
                <SourcingIntelligenceBanner items={items as never} />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  estado.paresPorProduto = {};
  rota.atual = "/pedidos";
  fetchAllRows.mockReset();
  fetchAllRows.mockImplementation(async () => {
    const linhas: Array<{ produto_id: string }> = [];
    for (const [produtoId, pares] of Object.entries(estado.paresPorProduto)) {
      for (let i = 0; i < pares; i++) linhas.push({ produto_id: produtoId });
    }
    return linhas;
  });
});

describe("SourcingIntelligenceBanner - LISTAR/CONECTAR deixa de ser botao morto (QA 253)", () => {
  it("o CONECTAR leva o comprador a tela de catalogo de produtos", async () => {
    estado.paresPorProduto = { p1: 0 };
    renderBanner([{ produto_id: "p1", descricao: "Camiseta Polo" }]);

    const botao = await screen.findByRole("button", { name: /Vincular fornecedores de Camiseta Polo/i });
    expect(screen.getByText("SEM VÍNCULO")).toBeInTheDocument();
    expect(botao).toHaveTextContent("CONECTAR");

    fireEvent.click(botao);

    expect(rota.atual).toBe("/catalogo-produtos");
  });

  it("o LISTAR tambem navega quando o produto ja tem parceiros", async () => {
    estado.paresPorProduto = { p1: 2 };
    renderBanner([{ produto_id: "p1", descricao: "Camiseta Polo" }]);

    const botao = await screen.findByRole("button", { name: /Listar fornecedores de Camiseta Polo/i });
    expect(screen.getByText("2 PARCEIROS")).toBeInTheDocument();

    fireEvent.click(botao);

    expect(rota.atual).toBe("/catalogo-produtos");
  });

  it("sem produto vinculado, o bloco explica o vazio em vez de so mostrar o cabecalho", async () => {
    renderBanner([{ descricao: "Item sem produto" }]);

    expect(
      await screen.findByText(/Nenhum item deste pedido tem produto vinculado para leitura de ecossistema/i),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: /Vincular fornecedores/i })).not.toBeInTheDocument());
  });

  it("busca os fornecedores de todos os itens numa unica consulta", async () => {
    estado.paresPorProduto = { p1: 2, p2: 1 };
    renderBanner([
      { produto_id: "p1", descricao: "Camiseta Polo" },
      { produto_id: "p2", descricao: "Caneca" },
    ]);

    expect(await screen.findByText("2 PARCEIROS")).toBeInTheDocument();
    expect(screen.getByText("1 PARCEIROS")).toBeInTheDocument();

    expect(fetchAllRows).toHaveBeenCalledTimes(1);
    const [tabela, coluna, options] = fetchAllRows.mock.calls[0];
    expect(tabela).toBe("produto_fornecedores");
    expect(coluna).toBe("produto_id");
    expect(options.filters).toEqual([
      { column: "produto_id", operator: "in", value: '("p1","p2")' },
    ]);
  });
});
