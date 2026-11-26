import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Etapa 198 (HK-09): com erro o supabase-js devolve `count: null` e o `?? 0` transformava a
// falha em "zero pendencia" -- o badge sumia e o menu afirmava zero.

const results = vi.hoisted(() => ({ byTable: {} as Record<string, { count: number | null; error: unknown }> }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const res = results.byTable[table] ?? { count: 0, error: null };
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = () => q;
      q.in = () => q;
      q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(res).then(resolve);
      return q;
    },
  },
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ organizationId: "org-1" }),
}));

vi.mock("@/features/empresas/hooks/useEmpresaFilter", () => ({
  useEmpresaFilter: () => ({ empresaIds: null, queryKeyPart: "todas" }),
}));

import { useSidebarBadges } from "@/hooks/useSidebarBadges";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe("useSidebarBadges - falha de contagem (HK-09)", () => {
  it("propaga o erro em vez de anunciar zero pendencia", async () => {
    results.byTable = {
      solicitacoes: { count: null, error: { message: "permission denied" } },
      cotacoes: { count: 0, error: null },
      pagamentos: { count: 0, error: null },
      approval_workflows: { count: 0, error: null },
    };

    const { result } = renderHook(() => useSidebarBadges(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ message: "permission denied" });
    expect(result.current.data).toBeUndefined();
  });

  it("sem erro continua devolvendo as contagens", async () => {
    results.byTable = {
      solicitacoes: { count: 3, error: null },
      cotacoes: { count: 0, error: null },
      pagamentos: { count: 1, error: null },
      approval_workflows: { count: 2, error: null },
    };

    const { result } = renderHook(() => useSidebarBadges(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ solicitacoes: 3, cotacoes: 0, pagamentos: 1, aprovacoes: 2 });
  });
});