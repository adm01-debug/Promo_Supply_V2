import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Solicitacoes from "@/pages/solicitacoes/Solicitacoes";

const estado = vi.hoisted(() => ({
  solicitacoes: [] as Array<Record<string, unknown>>,
  totalCount: 0,
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
  ultimaChamada: undefined as Record<string, unknown> | undefined,
}));

const empresaIdsVazio: string[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const consulta: Record<string, unknown> = {};
  for (const metodo of ["select", "eq", "in", "not", "order", "range", "limit", "update", "insert", "delete", "single", "maybeSingle"]) {
    consulta[metodo] = () => consulta;
  }
  consulta.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject);
  return { supabase: { from: () => consulta, channel: () => ({ on: () => ({ subscribe: () => undefined }) }), removeChannel: () => undefined } };
});

vi.mock("@/components/compras/NovaSolicitacaoModal", () => ({
  NovaSolicitacaoModal: () => null,
}));

vi.mock("@/components/compras/IAAdvisor", () => ({
  IAAdvisor: () => null,
}));

vi.mock("@/components/compras/FiltrosAvancados", () => ({
  FiltrosAvancados: () => null,
  initialFilters: {},
}));

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/useAccountFilters", () => ({
  useAccountFilters: () => ({
    loading: true,
    filters: { searchTerm: "", statusFilter: "todas", tipoFilter: "todos", advancedFilters: {} },
    patchFilters: vi.fn(),
  }),
}));

vi.mock("@/hooks/useRealtimeSubscription", () => ({
  useRealtimeSubscription: () => undefined,
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/features/empresas/hooks/useEmpresaFilter", () => ({
  useEmpresaFilter: () => ({ empresaIds: empresaIdsVazio }),
}));

vi.mock("@/features/solicitacoes", () => ({
  useSolicitacoes: (filtros: Record<string, unknown>) => {
    estado.ultimaChamada = filtros;
    return {
      solicitacoes: estado.solicitacoes,
      totalCount: estado.totalCount,
      loading: estado.loading,
      error: estado.error,
      updateStatus: vi.fn(),
      bulkDelete: vi.fn(),
      bulkUpdateStatus: vi.fn(),
      refetch: estado.refetch,
    };
  },
}));

vi.mock("@/features/solicitacoes/hooks/useFluxosAprovacao", () => ({
  useFluxosAprovacao: () => ({ fluxos: {}, historicos: {}, loading: false }),
}));

// A pagina resolve o nome do gestor com useQuery; este teste nao monta
// QueryClientProvider e nao esta medindo esse dado - o mapa fica vazio.
const semNomes = new Map<string, string>();
vi.mock("@/features/solicitacoes/hooks/useNomesDeGestor", () => ({
  useNomesDeGestor: () => semNomes,
}));

const renderSolicitacoes = () =>
  render(
    <MemoryRouter>
      <Solicitacoes />
    </MemoryRouter>,
  );

beforeEach(() => {
  estado.solicitacoes = [];
  estado.totalCount = 0;
  estado.loading = false;
  estado.error = null;
  estado.refetch = vi.fn();
  estado.ultimaChamada = undefined;
});

describe("Solicitacoes - falha de carga nao vira lista vazia (QA 250)", () => {
  it("mostra o erro da consulta no lugar do 'Nenhum registro encontrado'", () => {
    estado.error = "permission denied for table solicitacoes";
    renderSolicitacoes();

    expect(screen.getByText(/carregar as solicita/i)).toBeInTheDocument();
    expect(screen.getByText("permission denied for table solicitacoes")).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum registro encontrado/i)).not.toBeInTheDocument();
  });

  it("o botao de nova tentativa chama o refetch do hook", () => {
    estado.error = "timeout";
    renderSolicitacoes();

    fireEvent.click(screen.getByRole("button", { name: /Tentar de novo/i }));

    expect(estado.refetch).toHaveBeenCalledTimes(1);
  });

  it("pede a pagina ao hook, em vez de aceitar a fatia padrao", () => {
    renderSolicitacoes();

    expect(estado.ultimaChamada).toMatchObject({ page: 0, pageSize: 100 });
  });
});

describe("Solicitacoes - paginador ligado ao total (QA 250)", () => {
  it("o fonte usa totalCount no badge e no rodape, e desabilita Anterior na primeira pagina", () => {
    const fonte = readFileSync(resolve(process.cwd(), "src/pages/solicitacoes/Solicitacoes.tsx"), "utf8");

    expect(fonte).toContain("totalCount > filteredSolicitacoes.length");
    expect(fonte).toContain("Mostrando {filteredSolicitacoes.length} de {totalCount}");
    expect(fonte).toContain("disabled={page === 0}");
    expect(fonte).toContain("SOLICITACOES_PAGE_SIZE >= totalCount");
  });
});