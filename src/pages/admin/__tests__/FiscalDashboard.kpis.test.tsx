import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FiscalDashboard from "../FiscalDashboard";

const mocks = vi.hoisted(() => ({
  events: [] as Record<string, unknown>[],
  kpiRows: [] as Record<string, unknown>[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      let colunas = "";
      const builder = {
        select: (cols: string) => { colunas = cols; return builder; },
        order: () => builder,
        limit: () => Promise.resolve({ data: mocks.events, error: null }),
        gte: () => Promise.resolve({ data: colunas === "*" ? mocks.events : mocks.kpiRows, error: null }),
      };
      return builder;
    },
  },
}));

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FiscalDashboard />
    </QueryClientProvider>,
  );
}

const texto = () => document.body.textContent ?? "";

beforeEach(() => {
  mocks.events = [];
  mocks.kpiRows = [];
});

afterEach(() => {
  cleanup();
});

describe("KPIs do painel fiscal derivados de fiscal_events", () => {
  it("mostra ausencia de dados sem inventar SEFAZ online nem latencia fixa", async () => {
    renderPage();

    await waitFor(() => expect(texto()).toContain("Eventos no mês: 0"));
    expect(texto()).toContain("SEFAZ: Sem erros no mês");
    expect(texto()).toContain("Nenhuma rejeição no mês");
    expect(texto()).toContain("Sem evento processado no mês");
    expect(texto()).not.toContain("SEFAZ: Online");
    expect(texto()).not.toContain("1.4s");
  });

  it("calcula autorizadas, pendentes, erros e latencia media real", async () => {
    mocks.kpiRows = [
      { status: "authorized", created_at: "2026-11-20T10:00:00Z", processed_at: "2026-11-20T10:00:02Z" },
      { status: "authorized", created_at: "2026-11-20T11:00:00Z", processed_at: "2026-11-20T11:00:04Z" },
      { status: "pending", created_at: "2026-11-20T12:00:00Z", processed_at: null },
      { status: "error", created_at: "2026-11-20T13:00:00Z", processed_at: null },
    ];

    renderPage();

    await waitFor(() => expect(texto()).toContain("Eventos no mês: 4"));
    expect(texto()).toContain("SEFAZ: Oscilação detectada");
    expect(texto()).toContain("3.0s");
    expect(texto()).toContain("Ação manual necessária");
  });
});
