import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Etapa 199 (HK-10): a chave da consulta de itens era o TAMANHO da lista de pedidos. Trocar um
// pedido por outro (um cancelado, outro criado) mantinha a chave e os itens antigos ficavam
// servidos por 120 s (staleTime). A chave passa a ser um resumo estavel dos ids.

const estado = vi.hoisted(() => ({
  pedidos: [] as Array<Record<string, unknown>>,
  itensFetches: 0,
}));

const pedido = (id: string) => ({
  id,
  numero: `PED-${id}`,
  status: "aprovado",
  valor_total: 100,
  valor_frete: 0,
  desconto: 0,
  data_emissao: "2026-01-01",
  data_previsao: null,
  data_entrega: null,
  fornecedor_id: "f1",
  solicitacao_id: null,
  created_at: "2026-01-01T00:00:00Z",
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (tabela: string) => {
      const b: Record<string, unknown> = {};
      const encadeia = () => b;
      b.select = encadeia;
      b.eq = encadeia;
      b.in = encadeia;
      b.order = encadeia;
      b.limit = encadeia;
      b.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) => {
        if (tabela === "pedido_itens") estado.itensFetches += 1;
        const rows =
          tabela === "pedidos" ? estado.pedidos : tabela === "pedido_itens" ? [{ id: "i1", pedido_id: estado.pedidos[0]?.id ?? "x" }] : [];
        return Promise.resolve({ data: rows, error: null, count: null }).then(resolve, reject);
      };
      return b;
    },
  },
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ organizationId: "org1", tenantId: "org1", user: { id: "u1" } }),
}));

import { usePurchaseHistory } from "@/hooks/usePurchaseHistory";

const wrapperCom = (qc: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

describe("usePurchaseHistory - chave dos itens (HK-10)", () => {
  beforeEach(() => {
    estado.pedidos = [pedido("p1"), pedido("p2"), pedido("p3")];
    estado.itensFetches = 0;
  });

  it("rebusca os itens quando o conjunto de pedidos muda sem mudar de tamanho", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => usePurchaseHistory(), { wrapper: wrapperCom(qc) });

    await waitFor(() => expect(estado.itensFetches).toBe(1));

    // Mesmo tamanho (3), ids diferentes: um pedido cancelado saiu e outro entrou.
    estado.pedidos = [pedido("p1"), pedido("p3"), pedido("p4")];
    await act(async () => {
      await qc.invalidateQueries({ queryKey: ["purchase-history-pedidos"] });
    });

    await waitFor(() => expect(estado.itensFetches).toBe(2));
  });
});