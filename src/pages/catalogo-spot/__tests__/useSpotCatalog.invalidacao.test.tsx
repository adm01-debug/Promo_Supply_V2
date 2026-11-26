import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Etapa 193 (HK-06): o onSuccess do "Sincronizar catalogo SPOT" invalidava ['spot-products'] e
// ['spot-stock'], mas as queries reais sao ['spot-produtos'] e ['spot-estoque']. Cada clique
// consome 1 requisicao da cota diaria da SPOT e a tela continuava com o dado velho.

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "order", "limit", "eq", "in", "or", "contains", "not", "is"]) q[m] = () => q;
      q.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
      return q;
    },
    functions: { invoke: vi.fn(async () => ({ data: { success: true, records: 12 }, error: null })) },
  },
}));

import { useTriggerSpotSync } from "@/pages/catalogo-spot/useSpotCatalog";

const wrapperCom = (qc: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

describe("useTriggerSpotSync - invalidacao das chaves reais (HK-06)", () => {
  it("invalida produtos e estoque com as mesmas chaves que as queries usam", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["spot-produtos", { search: null, collection: null, typeCodes: null }], []);
    qc.setQueryData(["spot-estoque", ["SKU-1"]], []);
    qc.setQueryData(["spot-skus", ["SKU-1"]], []);

    const { result } = renderHook(() => useTriggerSpotSync(), { wrapper: wrapperCom(qc) });
    await act(async () => {
      await result.current.mutateAsync("syncCatalog");
    });

    const invalidada = (chave: unknown[]) => qc.getQueryState(chave)?.isInvalidated === true;

    expect(invalidada(["spot-produtos", { search: null, collection: null, typeCodes: null }])).toBe(true);
    expect(invalidada(["spot-estoque", ["SKU-1"]])).toBe(true);
    expect(invalidada(["spot-skus", ["SKU-1"]])).toBe(true);
  });
});