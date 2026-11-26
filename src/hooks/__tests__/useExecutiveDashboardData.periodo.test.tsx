import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { useExecutiveDashboardData } from "../useExecutiveDashboardData";

// Etapa QA 215 (PERF-03 parte 2/3): o painel executivo baixava as tabelas
// inteiras (9 fetchAllRows) e so recortava o periodo no cliente, em `select`.
// Agora o recorte vai ao SQL nas tabelas sem fallback de data; `pedidos` segue
// local porque o recorte usa `data_emissao || created_at`.

type Filtro = { column: string; operator: string; value: string };
type Chamada = { tabela: string; filtros: Filtro[] };

let chamadas: Chamada[] = [];

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ organizationId: "org1" }),
}));

vi.mock("@/lib/paginatedFetch", () => ({
  fetchAllRows: (tabela: string, _select: string, options?: { filters?: Filtro[] }) => {
    chamadas.push({ tabela, filtros: options?.filters ?? [] });
    return Promise.resolve([]);
  },
}));

const criarWrapper = (client: QueryClient) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);

const montarHook = (periodDays?: number) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = renderHook(() => useExecutiveDashboardData(periodDays ? { periodDays } : undefined), {
    wrapper: criarWrapper(client),
  });
  return { client, view };
};

const filtrosDe = (tabela: string) => chamadas.filter((c) => c.tabela === tabela).flatMap((c) => c.filtros);
const temGte = (tabela: string, coluna: string) =>
  filtrosDe(tabela).find((f) => f.column === coluna && f.operator === "gte");

describe("useExecutiveDashboardData - recorte de periodo no SQL (etapa 215)", () => {
  beforeEach(() => {
    chamadas = [];
  });

  it("empurra o corte de data de solicitacoes, fiscal_documents e savings_tracker para o SQL", async () => {
    montarHook(30);

    await waitFor(() => expect(chamadas.length).toBeGreaterThanOrEqual(9));

    const sol = temGte("solicitacoes", "created_at");
    const fiscal = temGte("fiscal_documents", "data_emissao");
    const savings = temGte("savings_tracker", "realized_date");

    expect(sol).toBeDefined();
    expect(fiscal).toBeDefined();
    expect(savings).toBeDefined();
    // o corte tem de ser uma data ISO (YYYY-MM-DD), nao o periodo em dias
    expect(sol?.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fiscal?.value).toBe(sol?.value);
    expect(savings?.value).toBe(sol?.value);
  });

  it("nao filtra pedidos por created_at (o recorte local usa data_emissao com fallback)", async () => {
    montarHook(30);

    await waitFor(() => expect(chamadas.length).toBeGreaterThanOrEqual(9));

    expect(temGte("pedidos", "created_at")).toBeUndefined();
    expect(temGte("pedidos", "data_emissao")).toBeUndefined();
  });

  it("sem periodo definido nenhuma tabela recebe corte de data", async () => {
    montarHook();

    await waitFor(() => expect(chamadas.length).toBeGreaterThanOrEqual(9));

    expect(filtrosDe("solicitacoes").some((f) => f.operator === "gte")).toBe(false);
    expect(filtrosDe("fiscal_documents").some((f) => f.operator === "gte")).toBe(false);
    expect(filtrosDe("savings_tracker").some((f) => f.operator === "gte")).toBe(false);
  });

  it("mantem organization_id (ou tenant_id) em toda tabela consultada", async () => {
    montarHook(30);

    await waitFor(() => expect(chamadas.length).toBeGreaterThanOrEqual(9));

    const colunaDeTenant: Record<string, string> = {
      pedidos: "organization_id",
      solicitacoes: "organization_id",
      fornecedores: "organization_id",
      contracts: "organization_id",
      approval_workflows: "organization_id",
      categorias: "organization_id",
      profiles: "current_organization_id",
      fiscal_documents: "organization_id",
      savings_tracker: "tenant_id",
    };

    for (const [tabela, coluna] of Object.entries(colunaDeTenant)) {
      expect(filtrosDe(tabela).some((f) => f.column === coluna && f.operator === "eq" && f.value === "org1")).toBe(true);
    }
  });
});

describe("etapa 215 - chave de cache e carga do widget de clima", () => {
  it("a chave das queries com corte no SQL inclui a data de corte (senao o cache do periodo antigo vaza)", () => {
    const fonte = fs.readFileSync(
      path.join(process.cwd(), "src", "hooks", "useExecutiveDashboardData.ts"),
      "utf8",
    );

    // periodo nulo nao pode ser um item extra: o corte sempre aparece como 3o item
    expect(fonte).toContain("queryKey: ['exec-solicitacoes', organizationId, cutoffDate]");
    expect(fonte).toContain("queryKey: ['exec-fiscal-documents', organizationId, cutoffDate]");
    expect(fonte).toContain("queryKey: ['exec-savings-tracker', organizationId, cutoffDate]");
  });

  it("o widget de clima usa a organizacao na chave e nao pede COUNT que ninguem le", () => {
    const fonte = fs.readFileSync(
      path.join(process.cwd(), "src", "components", "compras", "PurchaseClimateWidget.tsx"),
      "utf8",
    );

    expect(fonte).toContain("queryKey: ['purchase-climate-stats', organizationId]");
    expect(fonte).not.toContain("count: 'exact'");
    // colunas que o componente nao lê nao devem ser baixadas
    expect(fonte).not.toContain("valor_estimado");
    expect(fonte).not.toContain("data_entrega");
  });
});
