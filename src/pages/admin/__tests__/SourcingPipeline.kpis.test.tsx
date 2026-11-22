import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SourcingPipeline from "../SourcingPipeline";

const mocks = vi.hoisted(() => ({ projects: [] as unknown[], savings: [] as unknown[] }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const rows = table === "sourcing_projects" ? mocks.projects : mocks.savings;
      const builder = {
        select: () => builder,
        order: () => Promise.resolve({ data: rows, error: null }),
      };
      return builder;
    },
  },
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SourcingPipeline />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.projects = [];
  mocks.savings = [];
});

afterEach(() => {
  cleanup();
});

describe("KPIs do Sourcing Pipeline derivados do banco", () => {
  it("nao exibe numeros fixos quando nao ha projeto", async () => {
    renderPage();

    expect(await screen.findByText(/sem projeto/i)).toBeTruthy();
    expect(screen.queryByText(/Meta Q2/)).toBeNull();
    expect(screen.queryByText(/12\.4M/)).toBeNull();
    expect(screen.queryByText(/14\.2%/)).toBeNull();
  });

  it("agrega estimated_spend dos projetos ativos ignorando concluidos", async () => {
    mocks.projects = [
      { id: "1", title: "A", status: "negotiation", estimated_spend: 1_500_000, target_saving_pct: 20, category_id: "c1" },
      { id: "2", title: "B", status: "planning", estimated_spend: 500_000, target_saving_pct: 10, category_id: "c2" },
      { id: "3", title: "C", status: "completed", estimated_spend: 9_999_999, target_saving_pct: 90, category_id: "c3" },
    ];

    renderPage();

    expect(await screen.findByText("R$ 2M")).toBeTruthy();
    expect(screen.getByText(/1 em negocia/)).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });
});
