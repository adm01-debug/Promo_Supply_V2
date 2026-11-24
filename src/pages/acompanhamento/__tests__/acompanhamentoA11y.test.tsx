import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Acompanhamento from "../Acompanhamento";

const { pedidos, solicitacoes, patchFilters, cincoDiasAtras } = vi.hoisted(() => {
  const cincoDiasAtras = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  return {
    cincoDiasAtras,
    pedidos: [{
      id: "11111111-1111-1111-1111-111111111111",
      numero: "PO-7777",
      status: "pendente",
      valor_total: 1200,
      data_previsao: cincoDiasAtras,
      data_emissao: null,
      created_at: new Date().toISOString(),
      fornecedor_id: null,
      solicitacao_id: "22222222-2222-2222-2222-222222222222",
    }],
    solicitacoes: [{
      id: "22222222-2222-2222-2222-222222222222",
      descricao: "Cabo HDMI 2m",
      quantidade: 10,
      data_necessidade: cincoDiasAtras,
      status: "aprovada",
      created_at: new Date().toISOString(),
    }],
    patchFilters: vi.fn(),
  };
});

vi.mock("@/integrations/supabase/client", () => {
  const linhas: Record<string, unknown[]> = {
    pedidos,
    solicitacoes,
    fornecedores: [],
    fiscal_documents: [],
    fiscal_events: [],
  };
  const construtor = (tabela: string) => {
    const b: Record<string, unknown> = {};
    for (const metodo of ["select", "not", "eq", "in", "order", "limit", "update"]) {
      b[metodo] = () => b;
    }
    b.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve({ data: linhas[tabela] ?? [], error: null }).then(resolve, reject);
    return b;
  };
  return { supabase: { from: (tabela: string) => construtor(tabela) } };
});

vi.mock("@/hooks/useAccountFilters", () => ({
  useAccountFilters: () => ({
    loading: false,
    filters: { searchTerm: "", filtroSLA: "todos" },
    patchFilters,
  }),
}));
vi.mock("@/hooks/useClearFiltersFlow", () => ({ useClearFiltersFlow: () => ({}) }));
vi.mock("@/hooks/useRealtimeSubscription", () => ({ useRealtimeSubscription: () => undefined }));
vi.mock("@/components/compras/KanbanBoard", () => ({ KanbanBoard: () => null }));
vi.mock("@/components/compras/PedidoTimeline", () => ({ PedidoTimeline: () => null }));

const renderPagina = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <Acompanhamento />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

const cartaoSLA = async (rotulo: string) =>
  screen.findByRole("button", { name: new RegExp(`Filtrar SLA por ${rotulo}`, "i") });

describe("Acompanhamento - filtros de SLA acessiveis pelo teclado (etapa 234)", () => {
  it("cartao filtravel expoe papel de botao, nome e estado inicial do filtro", async () => {
    renderPagina();
    const atrasados = await cartaoSLA("ATRASADOS");
    expect(atrasados).toHaveAttribute("aria-pressed", "false");
    expect(atrasados).toHaveAttribute("tabindex", "0");
  });

  it("Enter aplica o filtro e espaco limpa de volta", async () => {
    renderPagina();
    const atrasados = await cartaoSLA("ATRASADOS");
    fireEvent.keyDown(atrasados, { key: "Enter" });
    expect(atrasados).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(atrasados, { key: " " });
    expect(atrasados).toHaveAttribute("aria-pressed", "false");
  });

  it("cartoes que nao filtram continuam sem papel de botao", async () => {
    renderPagina();
    await cartaoSLA("ATRASADOS");
    const cartaoDe = (rotulo: RegExp) => screen.getByText(rotulo).parentElement as HTMLElement;
    const cartaoAtrasados = cartaoDe(/ATRASADOS/);
    expect(cartaoAtrasados).toHaveAttribute("role", "button");
    const grid = cartaoAtrasados.parentElement as HTMLElement;
    expect(grid.children.length).toBe(5);
    expect(grid.querySelectorAll('[role="button"]').length).toBe(3);
  });

  it("cartao de urgencia abre os detalhes do pedido com Enter", async () => {
    renderPagina();
    const cartoes = await screen.findAllByRole("button", { name: /Ver detalhes do pedido #PO-7777/i });
    expect(cartoes.length).toBeGreaterThan(0);
    fireEvent.keyDown(cartoes[0], { key: "Enter" });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("cartao de urgencia ignora teclas que nao acionam", async () => {
    renderPagina();
    const cartoes = await screen.findAllByRole("button", { name: /Ver detalhes do pedido #PO-7777/i });
    fireEvent.keyDown(cartoes[0], { key: "a" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
