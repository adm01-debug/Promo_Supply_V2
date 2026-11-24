import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SourcingIntelligenceBanner } from "@/components/compras/ProductionRoutingEngine";

const estado = vi.hoisted(() => ({
  paresPorProduto: {} as Record<string, number>,
}));

vi.mock("@/integrations/supabase/client", () => {
  const criarBuilder = () => {
    let produtoId = "";
    const builder = {
      select: () => builder,
      eq: (_coluna: string, valor: string) => {
        produtoId = valor;
        return builder;
      },
      then: (resolve: (valor: unknown) => unknown) =>
        resolve({ data: [], count: estado.paresPorProduto[produtoId] ?? 0, error: null }),
    };
    return builder;
  };

  return { supabase: { from: () => criarBuilder() } };
});

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
});
