import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRelatorioNegociacoes } from "../useRelatorioNegociacoes";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));

type Response = { data: unknown[]; error: null };
type Query = {
  select: (columns: string) => Query; gte: () => Query; order: () => Query;
  then: Promise<Response>["then"];
};

const clients: QueryClient[] = [];
const profiles: Array<Record<string, unknown>> = [];
const selects = new Map<string, string>();

function fixture() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return renderHook(() => useRelatorioNegociacoes("6m"), {
    wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}

beforeEach(() => {
  vi.clearAllMocks(); selects.clear(); profiles.splice(0);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Rede bloqueada no teste"); }));
  vi.stubGlobal("WebSocket", vi.fn(() => { throw new Error("WebSocket bloqueado no teste"); }));
  mocks.from.mockImplementation((table: string) => {
    const rows: Array<Record<string, unknown>> = table === "profiles" ? profiles : table === "cotacoes"
      ? [80, 100].map((score, index) => ({ id: `cotacao-${index}`, numero: `C${index}`, solicitacao_id: null, fornecedor_id: null, valor_total: 100, valor_unitario: 100, desconto_percentual: 10, status: "aprovada", selecionada: true, avaliador_id: "buyer", created_at: "2026-11-01", prazo_entrega: 1, score_total: score }))
      : [];
    let selected = rows;
    const builder: Query = {
      select: (columns) => {
        selects.set(table, columns);
        selected = rows.map((row) => Object.fromEntries(columns.split(",").map((column) => [column.trim(), row[column.trim()]])));
        return builder;
      },
      gte: () => builder, order: () => builder,
      then: (resolve, reject) => Promise.resolve({ data: selected, error: null }).then(resolve, reject),
    };
    return builder;
  });
});

afterEach(() => { cleanup(); for (const client of clients.splice(0)) client.clear(); vi.unstubAllGlobals(); });

describe("contratos do relatorio de negociacoes", () => {
  it("consulta somente colunas existentes de profiles e inclui score_total na media", async () => {
    profiles.push({ id: "buyer", full_name: "Ana Souza", email: "ana@example.invalid" });
    const { result } = fixture();
    await waitFor(() => expect(result.current.data?.comparativoCompradores[0]).toMatchObject({ nome: "Ana Souza", avatar: "AS", melhorPreco: 90, cotacoes: 2 }));
    expect(selects.get("profiles")).toBe("id, full_name, email");
    expect(selects.get("cotacoes")?.split(",").map((column) => column.trim())).toContain("score_total");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("usa email quando full_name e nulo e Usuario quando perfil nao existe", async () => {
    profiles.push({ id: "buyer", full_name: null, email: "comprador@example.invalid" });
    const first = fixture();
    await waitFor(() => expect(first.result.current.data?.comparativoCompradores[0].nome).toBe("comprador@example.invalid"));
    first.unmount();
    profiles.splice(0);
    const second = fixture();
    await waitFor(() => expect(second.result.current.data?.comparativoCompradores[0]).toMatchObject({ nome: "Usuário", avatar: "U", melhorPreco: 90 }));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
