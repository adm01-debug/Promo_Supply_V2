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

const badges = vi.hoisted(() => ({ state: { data: undefined as unknown, isError: false } }));

vi.mock("@/hooks/useSidebarBadges", () => ({
  useSidebarBadges: () => badges.state,
}));

import { AppSidebar } from "../components/AppSidebar";

// Etapa 198 (HK-09): quando a contagem falha o menu mostrava o mesmo que "zero pendencia"
// (badge nenhum). Agora mostra um marcador de indisponivel.

function renderSidebar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/compras"]}>
        <TooltipProvider>
          <AppSidebar collapsed={false} onToggle={() => {}} />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AppSidebar - contagem de pendencias indisponivel (HK-09)", () => {
  it("mostra marcador de indisponivel em vez de esconder o badge", () => {
    badges.state = { data: undefined, isError: true };
    const { container } = renderSidebar();

    expect(container.querySelectorAll('[title="Não foi possível contar as pendências"]').length).toBeGreaterThan(0);
  });

  it("com contagem zero nao mostra marcador nem numero", () => {
    badges.state = { data: { solicitacoes: 0, cotacoes: 0, pagamentos: 0, aprovacoes: 0 }, isError: false };
    const { container } = renderSidebar();

    expect(container.querySelectorAll('[title="Não foi possível contar as pendências"]').length).toBe(0);
    expect(screen.getByRole("link", { name: "Pagamentos" })).toBeInTheDocument();
  });
});