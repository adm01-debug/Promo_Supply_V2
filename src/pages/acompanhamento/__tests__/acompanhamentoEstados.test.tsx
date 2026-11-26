import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Acompanhamento from "@/pages/acompanhamento/Acompanhamento";

const estado = vi.hoisted(() => ({
  erroPorTabela: {} as Record<string, { message: string } | null>,
  buscas: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const criar = (tabela: string) => {
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "not", "order", "limit", "range", "update", "insert", "delete"]) b[m] = () => b;
    b.then = (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) => {
      estado.buscas.push(tabela);
      return Promise.resolve({ data: [], error: estado.erroPorTabela[tabela] ?? null, count: 0 }).then(ok, err);
    };
    return b;
  };
  return { supabase: { from: (tabela: string) => criar(tabela) } };
});

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/hooks/useAccountFilters", () => ({
  useAccountFilters: () => ({
    filters: { searchTerm: "", filtroSLA: "todos" },
    loading: false,
    isAuthenticated: false,
    setFilters: vi.fn(),
    patchFilters: vi.fn(),
    clearFilters: vi.fn(async () => []),
    restoreFilters: vi.fn(),
    legacyStorageKey: "filters_acompanhamento",
  }),
}));

vi.mock("@/hooks/useClearFiltersFlow", () => ({
  useClearFiltersFlow: () => ({ requestClear: vi.fn(), ConfirmDialog: null }),
}));

vi.mock("@/hooks/useRealtimeSubscription", () => ({
  useRealtimeSubscription: () => undefined,
}));

vi.mock("@/components/compras/KanbanBoard", () => ({ KanbanBoard: () => null }));
vi.mock("@/components/compras/PedidoTimeline", () => ({ PedidoTimeline: () => null }));

const renderizar = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Acompanhamento />
      </QueryClientProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  estado.erroPorTabela = {};
  estado.buscas = [];
});

describe("Acompanhamento - falha de carga nao vira pipeline vazio nem KPI zerado (QA 252)", () => {
  it("mostra o erro da consulta de pedidos e um botao de nova tentativa", async () => {
    estado.erroPorTabela.pedidos = { message: "permission denied for table pedidos" };
    renderizar();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(/Não foi possível carregar o acompanhamento/i);
    expect(alerta).toHaveTextContent("permission denied for table pedidos");
    expect(screen.queryByText(/Sem Fluxos Correspondentes/i)).not.toBeInTheDocument();
    expect(screen.queryByText("TRÂNSITO")).not.toBeInTheDocument();
  });

  it("o botao de nova tentativa refaz a busca", async () => {
    estado.erroPorTabela.pedidos = { message: "timeout" };
    renderizar();

    await screen.findByRole("alert");
    const antes = estado.buscas.filter((t) => t === "pedidos").length;
    screen.getByRole("button", { name: /Tentar de novo/i }).click();

    await waitFor(() => {
      expect(estado.buscas.filter((t) => t === "pedidos").length).toBeGreaterThan(antes);
    });
  });

  it("erro só nas tabelas de apoio (fornecedores) tambem nao passa por lista vazia", async () => {
    estado.erroPorTabela.fornecedores = { message: "network error" };
    renderizar();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("network error");
    expect(screen.queryByText(/Sem Fluxos Correspondentes/i)).not.toBeInTheDocument();
  });

  it("erro sem message nao imprime [object Object]", async () => {
    estado.erroPorTabela.pedidos = {} as { message: string };
    renderizar();

    const alerta = await screen.findByRole("alert");
    expect(alerta).not.toHaveTextContent("[object Object]");
    expect(alerta).toHaveTextContent(/Falha ao consultar o acompanhamento/i);
  });

  it("sem erro e sem pedidos, o estado vazio legitimo continua igual", async () => {
    renderizar();

    expect(await screen.findByText(/Sem Fluxos Correspondentes/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});