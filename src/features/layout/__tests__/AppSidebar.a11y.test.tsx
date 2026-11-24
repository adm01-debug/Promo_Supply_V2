import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(), auth: { getSession: vi.fn() }, functions: { invoke: vi.fn() } },
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ signOut: vi.fn(), hasRole: () => true, user: { id: "u1" }, organizationId: "org-1" }),
}));

vi.mock("@/hooks/useCriticalAlertsBadge", () => ({
  useCriticalAlertsBadge: () => ({ count: 0, markAsSeen: vi.fn() }),
}));

vi.mock("@/hooks/useSidebarBadges", () => ({
  useSidebarBadges: () => ({ data: {} }),
}));

import { AppSidebar } from "../components/AppSidebar";

// Etapa QA 229 (UX-04 parte 1/4): com a sidebar recolhida o nome do modulo so
// existia no Tooltip (aria-describedby), entao o link ficava sem nome acessivel.

function renderSidebar(collapsed: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/compras"]}>
        <TooltipProvider>
          <AppSidebar collapsed={collapsed} onToggle={() => {}} />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AppSidebar acessibilidade (UX-04 1/4)", () => {
  it("sidebar recolhida: os links de modulo continuam com nome acessivel", () => {
    renderSidebar(true);
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    const pedidos = screen.getByRole("link", { name: "Pedidos" });
    expect(pedidos).toHaveAttribute("aria-label", "Pedidos");
  });

  it("sidebar recolhida: os dois controles do rodape tem nome", () => {
    renderSidebar(true);
    expect(screen.getByRole("link", { name: "Segurança" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
  });

  it("sidebar expandida: o nome visivel continua sendo o nome acessivel, sem aria-label", () => {
    renderSidebar(false);
    const pedidos = screen.getByRole("link", { name: "Pedidos" });
    expect(pedidos).not.toHaveAttribute("aria-label");
  });

  it("nenhum link da sidebar fica sem nome acessivel (recolhida ou expandida)", () => {
    for (const collapsed of [true, false]) {
      const { unmount } = renderSidebar(collapsed);
      const semNome = screen
        .getAllByRole("link")
        .filter((el) => !el.textContent?.trim() && !el.getAttribute("aria-label")?.trim());
      expect(semNome.map((el) => el.getAttribute("href"))).toEqual([]);
      unmount();
    }
  });
});
