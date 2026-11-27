import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Catalogo SPOT lido do PIM: dois defeitos medidos em producao em 28/11/2026.
// 1) As linhas do Spot chegam com supplier_code 'STRICKER' (razao social
//    "Spot | Stricker"); filtrar por 'SPOT' devolvia a tela vazia.
// 2) A busca por nome usava eq (igualdade exata), entao "caneca" nao achava
//    "Caneca em vidro 390 ml".
const espiao = vi.hoisted(() => ({ filtros: [] as Record<string, unknown>[], limite: 0 }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock("@/hooks/useCatalogoPim", () => ({
  invokeBridgeSelect: vi.fn(async (_t: string, opts: { filters?: Record<string, unknown>; limit?: number }) => {
    espiao.filtros.push(opts.filters ?? {});
    espiao.limite = opts.limit ?? 0;
    return [{
      supplier_code: "STRICKER",
      supplier_reference: "94614-103",
      sku: "94614-103",
      name: "Caneca em aco inox 230 ml",
      cost_price: 16.78,
      stock_quantity: 10,
      is_stockout: false,
    }];
  }),
}));

import { useSpotProducts, SPOT_SUPPLIER_CODES } from "../useSpotCatalog";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe("useSpotProducts - leitura do PIM", () => {
  beforeEach(() => {
    espiao.filtros.length = 0;
    espiao.limite = 0;
  });

  it("filtra o fornecedor pelas grafias que o PIM usa, nao so por 'SPOT'", async () => {
    const { result } = renderHook(
      () => useSpotProducts({ search: "", collection: null, typeCodes: null }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const fornecedor = espiao.filtros[0].supplier_code as { operator: string; value: string[] };
    expect(fornecedor.operator).toBe("in");
    expect(fornecedor.value).toContain("STRICKER");
    expect(fornecedor.value).toEqual(SPOT_SUPPLIER_CODES);
    expect(result.current.data?.[0]?.reference).toBe("94614-103");
  });

  it("busca por nome com ilike e escapa curinga e barra digitados", async () => {
    const { result } = renderHook(
      () => useSpotProducts({ search: "caneca 50%", collection: null, typeCodes: null }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const nome = espiao.filtros[0].name as { operator: string; value: string };
    expect(nome.operator).toBe("ilike");
    expect(nome.value).toBe("%caneca 50\\%%");
  });

  it("escapa meta-caracteres do like via escapeIlike (barra, cureta e parenteses)", async () => {
    const { result } = renderHook(
      () => useSpotProducts({ search: "a\\b_c (2)", collection: null, typeCodes: null }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const nome = espiao.filtros[0].name as { value: string };
    expect(nome.value).toBe("%a\\\\b\\_c \\(2\\)%");
  });

  it("le paginas no limite aceito pelo bridge", async () => {
    renderHook(() => useSpotProducts({ search: "", collection: null, typeCodes: null }), { wrapper });
    await waitFor(() => expect(espiao.limite).toBeGreaterThan(0));
    expect(espiao.limite).toBeLessThanOrEqual(500);
  });
});