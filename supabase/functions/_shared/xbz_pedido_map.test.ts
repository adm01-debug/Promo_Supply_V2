/**
 * Testes do mapeamento de `consultaPedidos` → `xbz_pedidos` (puro, sem rede/banco).
 * Fixture: forma real observada em 21/11/2026 (DOCS/INTEGRACOES/XBZ.md §4.2).
 * Rodar: deno test supabase/functions/_shared/xbz_pedido_map.test.ts
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapPedido, normalizePedidos } from "./xbz_pedido_map.ts";

const TENANT = "11111111-1111-1111-1111-111111111111";

/** Linha real (recorte dos 80 campos) — pedido pendente de 19/11/2026. */
const LINHA_PENDENTE = {
  id: 9313643,
  dataEmissao: "2026-11-19T10:12:00",
  carimboComercial: "",
  numero: "P9313643 (OC: OC-1234)",
  pedidoNumero: "P9313643",
  numeroPedidoInternoCliente: "OC-1234",
  dataEmissaoString: "19/11/2026",
  produtoPrecoUnitario: 0,
  produtoValorImpostosTaxasUnitario: 0,
  produtoValorTotal: 0,
  valorProdutos: 201.96,
  valor: 201.96,
  valorFormatado: "R$ 201,96",
  valorIpiTotal: 0,
  valorIpiTotalFormatado: "R$ 0,00",
  valorStTotal: 0,
  valorStTotalFormatado: "R$ 0,00",
  razaoSocial: "BRASIL MARCAS INDUSTRIA E COMERCIO DE BRINDES LTDA",
  cnpjCpf: "36835552000167",
  pessoaCodigo: 17617,
  idStatus: 2,
  statusData: "2026-11-19T10:12:00",
  statusLogistico: "AGUARDANDO PAGAMENTO PARA INICIAR A SEPARAÇÃO",
  loteDebitoStatus1Data: "2000-01-01T00:00:00",
  loteDebitoStatus2Data: "2000-01-01T00:00:00",
  loteDebitoStatus3Data: "2000-01-01T00:00:00",
  dataStatusLoteDebito: "2000-01-01T00:00:00",
  idLoteDebitoStatus: 0,
  loteDebitoStatus: "PENDENTE",
  loteDebitoStatusCliente: "PENDENTE",
  pagamentoTipoId: 4,
  pagamentoTipoNome: "PIX",
  impedirSeparacaoPedidoSemPagamento: true,
  vendedorNome: "SAC",
  qtdVolumes: 0,
  idTipoEntrega: 10,
  tipoEntrega: "BALCÃO/RETIRADA",
  transportadora: "",
  entregaTransportadoraGravacaoNome: "",
  prontoParaRetirada: false,
  produtoId: 23520,
  produtoCodigoSistema: "X235202",
  produtoCodigoComposto: "09211-AZU/PRE",
  produtoCodigoAmigavel: "09211",
  produtoNome: "Caneta Plástica",
  pedidoItemQuantidade: 150,
  pedidoItemId: 555,
  nfNumero: "",
  detalhes: "",
  expedicaoAgendamentoId: 0,
  statusRetirada: 1,
  pago: false,
};

Deno.test("mapPedido: lê os nomes reais do consultaPedidos (80 campos)", () => {
  const row = mapPedido(TENANT, LINHA_PENDENTE, "2026-11-21T00:00:00.000Z");
  assertEquals(row.pedido_numero, "P9313643");
  assertEquals(row.ordem_de_compra, "OC-1234");
  assertEquals(row.pessoa_id, 17617);
  assertEquals(row.pessoa_razao_social, "BRASIL MARCAS INDUSTRIA E COMERCIO DE BRINDES LTDA");
  assertEquals(row.id_status, 2);
  assertEquals(row.status_logistico, "AGUARDANDO PAGAMENTO PARA INICIAR A SEPARAÇÃO");
  assertEquals(row.valor_total, 201.96);
  assertEquals(row.valor_produtos, 201.96);
  assertEquals(row.valor_impostos_taxas, 0);
  assertEquals(row.quantidade, 150);
  assertEquals(row.produto_codigo_xbz, "X235202");
  assertEquals(row.produto_nome, "Caneta Plástica");
  assertEquals(row.nota_fiscal, null); // "" → null
  assertEquals(row.entrega_tipo_nome, "BALCÃO/RETIRADA");
  assertEquals(row.transportadora_nome, null);
  assertEquals(row.pago, false);
  assertEquals(row.data_pagamento, null);
  assertEquals(row.lote_debito_status1_data, null); // sentinela 2000-01-01
  assertEquals(row.last_synced_at, "2026-11-21T00:00:00.000Z");
});

Deno.test("mapPedido: `pago` boolean manda; fallback por idLoteDebitoStatus quando ausente", () => {
  const pagoBool = mapPedido(TENANT, {
    ...LINHA_PENDENTE,
    pago: true,
    idLoteDebitoStatus: 0,
    loteDebitoStatusCliente: "PAGO (20/11/26 09:15:30)",
  });
  assertEquals(pagoBool.pago, true);
  assertEquals(pagoBool.data_pagamento, "2026-11-20T09:15:30.000Z");

  const semBool = { ...LINHA_PENDENTE, idLoteDebitoStatus: 3, loteDebitoStatus2Data: "2026-11-20T09:15:30" } as Record<string, unknown>;
  delete semBool.pago;
  const fallback = mapPedido(TENANT, semBool);
  assertEquals(fallback.pago, true);
  assertEquals(fallback.data_pagamento, "2026-11-20T09:15:30.000Z");
});

Deno.test("mapPedido: sem pedidoNumero usa o prefixo de `numero` (\"P… (OC: …)\")", () => {
  const row = mapPedido(TENANT, { numero: "P9304784 (OC: 77)", valor: "6.040,44" });
  assertEquals(row.pedido_numero, "P9304784");
  assertEquals(row.valor_total, 6040.44);
});

Deno.test("mapPedido: nota fiscal e transportadora quando preenchidas", () => {
  const row = mapPedido(TENANT, {
    ...LINHA_PENDENTE,
    nfNumero: "123456",
    transportadora: "",
    entregaTransportadoraGravacaoNome: "RODONAVES",
    valorIpiTotal: 10.5,
    valorStTotal: 2.25,
  });
  assertEquals(row.nota_fiscal, "123456");
  assertEquals(row.transportadora_nome, "RODONAVES");
  assertEquals(row.valor_impostos_taxas, 12.75);
});

Deno.test("normalizePedidos: 1 linha por item → deduplica por pedido_numero e ignora lixo", () => {
  const rows = normalizePedidos(TENANT, [
    LINHA_PENDENTE,
    { ...LINHA_PENDENTE, pedidoItemId: 556, produtoNome: "Segundo item" },
    { ...LINHA_PENDENTE, pedidoNumero: "P9306328" },
    null,
    "texto",
    { produtoNome: "sem número" },
  ]);
  assertEquals(rows.length, 2);
  assertEquals(rows.map((r) => r.pedido_numero), ["P9313643", "P9306328"]);
  assertEquals(rows[0].produto_nome, "Caneta Plástica");
});

Deno.test("normalizePedidos: entrada não-array vira lista vazia", () => {
  assertEquals(normalizePedidos(TENANT, null), []);
  assertEquals(normalizePedidos(TENANT, { pedidoNumero: "P1" }), []);
});
