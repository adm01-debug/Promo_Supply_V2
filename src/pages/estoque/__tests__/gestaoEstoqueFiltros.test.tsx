import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GestaoEstoque from "@/pages/estoque/GestaoEstoque";

const estoque = [
  {
    id: "e1",
    produto_id: "p1",
    localizacao: "Almoxarifado Central",
    quantidade_atual: 2,
    estoque_minimo: 10,
    estoque_maximo: null,
    ponto_pedido: null,
    ultimo_inventario: null,
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T10:00:00.000Z",
    produto_nome: "Camiseta Polo",
    produto_codigo: "CAM-001",
  },
  {
    id: "e2",
    produto_id: "p2",
    localizacao: "Loja Centro",
    quantidade_atual: 40,
    estoque_minimo: 5,
    estoque_maximo: null,
    ponto_pedido: null,
    ultimo_inventario: null,
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T10:00:00.000Z",
    produto_nome: "Bone Trucker",
    produto_codigo: "BON-002",
  },
];

vi.mock("@/hooks/useEstoque", () => ({
  useEstoque: () => ({
    estoque,
    isLoading: false,
    movimentar: { mutateAsync: vi.fn(), isPending: false },
    criarItemEstoque: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

vi.mock("@/hooks/useProdutos", () => ({
  useProdutos: () => ({ produtos: [] }),
}));

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const renderEstoque = () =>
  render(
    <MemoryRouter>
      <GestaoEstoque />
    </MemoryRouter>,
  );

const abrirFiltros = () => {
  fireEvent.click(screen.getByRole("button", { name: /Filtros Avan/ }));
  return screen.getByRole("dialog");
};

// com o dialogo aberto o Radix marca o resto da pagina como aria-hidden, entao o
// botao de filtros (e o contador) so voltam a ser alcancaveis depois de fechar.
const fecharFiltros = () => {
  fireEvent.click(screen.getByRole("button", { name: /^Close$/i }));
};

describe("GestaoEstoque - Filtros Avancados deixam de ser botao morto (QA 253)", () => {
  it("o botao abre o dialogo de filtros", () => {
    renderEstoque();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const dialogo = abrirFiltros();

    expect(within(dialogo).getByText("Filtros Avançados")).toBeInTheDocument();
    expect(within(dialogo).getByText("Situação do Saldo")).toBeInTheDocument();
  });

  it("as localizacoes do filtro saem dos itens reais do estoque", () => {
    renderEstoque();
    const dialogo = abrirFiltros();

    const opcoes = within(dialogo)
      .getAllByRole("option")
      .map(opcao => opcao.textContent);

    expect(opcoes).toEqual(["Todas as localizações", "Almoxarifado Central", "Loja Centro"]);
  });

  it("filtrar por localizacao reduz a tabela ao item daquela localizacao", () => {
    renderEstoque();
    const dialogo = abrirFiltros();

    fireEvent.change(within(dialogo).getByLabelText(/Localização/i), {
      target: { value: "Loja Centro" },
    });

    expect(screen.getByText("Bone Trucker")).toBeInTheDocument();
    expect(screen.queryByText("Camiseta Polo")).not.toBeInTheDocument();
  });

  it("filtrar por situacao do saldo isola quem esta abaixo do minimo", () => {
    renderEstoque();
    const dialogo = abrirFiltros();

    fireEvent.click(within(dialogo).getByRole("button", { name: /Abaixo do mínimo/i }));

    expect(screen.getByText("Camiseta Polo")).toBeInTheDocument();
    expect(screen.queryByText("Bone Trucker")).not.toBeInTheDocument();
  });

  it("conta os filtros ativos e limpar devolve a lista completa", () => {
    renderEstoque();
    const dialogo = abrirFiltros();

    fireEvent.change(within(dialogo).getByLabelText(/Localização/i), {
      target: { value: "Loja Centro" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: /Abaixo do mínimo/i }));

    expect(screen.queryByText("Camiseta Polo")).not.toBeInTheDocument();
    expect(screen.queryByText("Bone Trucker")).not.toBeInTheDocument();

    fecharFiltros();

    const botaoFiltros = screen.getByRole("button", { name: /Filtros Avan/ });
    expect(within(botaoFiltros).getByText("2")).toBeInTheDocument();

    const dialogoReaberto = abrirFiltros();
    fireEvent.click(within(dialogoReaberto).getByRole("button", { name: /LIMPAR FILTROS/i }));
    fecharFiltros();

    expect(screen.getByText("Camiseta Polo")).toBeInTheDocument();
    expect(screen.getByText("Bone Trucker")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /Filtros Avan/ })).queryByText("2")).not.toBeInTheDocument();
  });
});
