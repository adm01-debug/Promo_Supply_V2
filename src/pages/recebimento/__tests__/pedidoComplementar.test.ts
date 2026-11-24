import { describe, it, expect, vi, beforeEach } from "vitest";
import { createComplementaryOrder } from "../pedidoComplementar";
import { buildPendingLines, defaultForecastDate } from "../recebimentoHelpers";
import type { PendingOrder } from "../recebimentoHelpers";

/**
 * Etapa 089 - o recebimento parcial gerava o pedido complementar copiando so
 * `tenant_id`. `pedidos` tem duas colunas de escopo: `tenant_id` sustenta a RLS
 * e `organization_id` e o filtro de leitura das telas (`usePedidos` filtra por
 * ela e `get_pedidos_kpis` a recebe como parametro). Sem a segunda coluna o
 * complementar nasce invisivel em toda tela de pedido. O mock abaixo guarda o
 * payload do insert para exigir as duas colunas.
 */
const estado = vi.hoisted(() => ({
  original: null as Record<string, unknown> | null,
  pedidoInserts: [] as Record<string, unknown>[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    const api: Record<string, unknown> = {};
    Object.assign(api, {
      select: () => api,
      eq: () => api,
      delete: () => api,
      insert: (payload: unknown) => {
        if (table === "pedidos") estado.pedidoInserts.push(payload as Record<string, unknown>);
        return api;
      },
      single: () => {
        if (table === "pedidos" && estado.pedidoInserts.length > 0) {
          return Promise.resolve({ data: { id: "novo-pedido" }, error: null });
        }
        return Promise.resolve(
          estado.original
            ? { data: estado.original, error: null }
            : { data: null, error: { message: "nenhuma linha" } },
        );
      },
      then: (ok: (valor: unknown) => unknown, falha: (erro: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(ok, falha),
    });
    return api;
  };

  return {
    supabase: { from: builder, rpc: () => Promise.resolve({ data: "PED-900", error: null }) },
  };
});

const itens: PendingOrder["itens"] = [
  { id: "A", descricao: "Caneta", quantidade: 10, quantidade_recebida: 0, unidade: "un", valor_unitario: 2 },
  { id: "B", descricao: "Caderno", quantidade: 5, quantidade_recebida: 0, unidade: null, valor_unitario: 10 },
];

describe("buildPendingLines", () => {
  it("gera uma linha por item com saldo, com a quantidade restante", () => {
    const lines = buildPendingLines(itens, { A: 4, B: 0 });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ descricao: "Caneta", quantidade: 6, valor_total: 12 });
    expect(lines[1]).toMatchObject({ descricao: "Caderno", quantidade: 5, valor_total: 50 });
  });

  it("ignora itens totalmente recebidos", () => {
    expect(buildPendingLines(itens, { A: 10, B: 5 })).toHaveLength(0);
  });

  it("ignora item recebido acima do pedido, sem gerar saldo negativo", () => {
    const lines = buildPendingLines(itens, { A: 12, B: 5 });
    expect(lines).toHaveLength(0);
  });

  it("usa 'un' quando o item nao tem unidade", () => {
    expect(buildPendingLines(itens, { A: 10, B: 1 })[0].unidade).toBe("un");
  });
});

describe("defaultForecastDate", () => {
  it("devolve a data de 7 dias a frente em YYYY-MM-DD", () => {
    expect(defaultForecastDate(new Date("2026-01-01T12:00:00Z"))).toBe("2026-01-08");
  });
});

const PEDIDO_ORIGINAL = {
  fornecedor_id: "forn-1",
  solicitacao_id: "sol-1",
  cotacao_id: null,
  condicao_pagamento: "30 dias",
  endereco_entrega: "Rua A, 10",
  tenant_id: "tenant-1",
  organization_id: "org-1",
};

/** Pedido de 20 com o item A pela metade: gera 1 linha pendente de valor 12. */
const pedidoEmRecebimento = (): PendingOrder => ({
  id: "ped-1",
  numero: "PED-1",
  fornecedor_nome: "Fornecedor",
  data_previsao: null,
  valor_total: 20,
  status: "aprovado",
  itens: [itens[0]],
});

describe("createComplementaryOrder", () => {
  beforeEach(() => {
    estado.original = { ...PEDIDO_ORIGINAL };
    estado.pedidoInserts.length = 0;
  });

  it("copia organization_id e tenant_id do pedido original", async () => {
    const resultado = await createComplementaryOrder(pedidoEmRecebimento(), { A: 4 });

    expect(resultado).toEqual({ created: true, numero: "PED-900", itemCount: 1 });
    expect(estado.pedidoInserts).toHaveLength(1);
    expect(estado.pedidoInserts[0]).toMatchObject({
      organization_id: "org-1",
      tenant_id: "tenant-1",
      valor_total: 12,
    });
  });

  it("nao gera complementar sem organization_id: ficaria invisivel em toda tela", async () => {
    estado.original = { ...PEDIDO_ORIGINAL, organization_id: null };

    const resultado = await createComplementaryOrder(pedidoEmRecebimento(), { A: 4 });

    expect(resultado).toEqual({ created: false, reason: "no-tenant" });
    expect(estado.pedidoInserts).toHaveLength(0);
  });
});
