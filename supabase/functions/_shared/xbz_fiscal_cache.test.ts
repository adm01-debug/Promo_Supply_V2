import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapFiscal, normalizeCores } from "./xbz_fiscal_cache.ts";

const TENANT = "11111111-1111-4111-8111-111111111111";

/** Resposta real de getSt?produto_id=23520 (21/11/2026), 16 campos. */
const GET_ST = {
  ProdutoSku: "13411",
  ProdutoCodigoComposto: "13411-09",
  ProdutoNome: "CANECA TERMICA 450ML",
  PrecoVenda: 34.9,
  PrecoVendaFormatado: "R$ 34,90",
  PrecoBaseCalculo: 29.75,
  PrecoBaseCalculoFormatado: "R$ 29,75",
  ValorStCalculado: 3.21,
  ValorStFormatado: "R$ 3,21",
  PercentualIpi: 11,
  ValorIpiCalculado: 3.84,
  ValorIpiFormatado: "R$ 3,84",
  Ncm: "96081000",
  NotasDeCalculo: "UF SP; IPI 11%; MVA ajustado 70%; ST LANCADO",
  ValorMvaConsiderado: 70,
};

Deno.test("fiscal: mapeia os campos reais do getSt", () => {
  const row = mapFiscal(TENANT, 23520, GET_ST, "2026-11-21T12:00:00.000Z");
  assertNotEquals(row, null);
  assertEquals(row!.tenant_id, TENANT);
  assertEquals(row!.produto_id, 23520);
  assertEquals(row!.sku, "13411");
  assertEquals(row!.ncm, "96081000");
  assertEquals(row!.preco_venda, 34.9);
  assertEquals(row!.preco_base_calculo, 29.75);
  assertEquals(row!.percentual_ipi, 11);
  assertEquals(row!.valor_ipi, 3.84);
  assertEquals(row!.valor_st, 3.21);
  assertEquals(row!.valor_mva, 70);
  assertEquals(row!.notas_calculo, "UF SP; IPI 11%; MVA ajustado 70%; ST LANCADO");
  assertEquals(row!.last_synced_at, "2026-11-21T12:00:00.000Z");
  assertEquals((row!.raw as Record<string, unknown>).ProdutoCodigoComposto, "13411-09");
});

Deno.test("fiscal: aceita camelCase e numero em string pt-BR", () => {
  const row = mapFiscal(TENANT, 1, {
    produtoSku: "999",
    ncm: "39269090",
    precoVenda: "1.234,56",
    valorStCalculado: "0",
  });
  assertEquals(row!.sku, "999");
  assertEquals(row!.preco_venda, 1234.56);
  assertEquals(row!.valor_st, 0);
  assertEquals(row!.valor_ipi, null);
});

Deno.test("fiscal: nao grava linha sem conteudo fiscal nem sem produto/tenant", () => {
  assertEquals(mapFiscal(TENANT, 23520, {}), null);
  assertEquals(mapFiscal(TENANT, 23520, { NotasDeCalculo: "" }), null);
  assertEquals(mapFiscal(TENANT, 0, GET_ST), null);
  assertEquals(mapFiscal("", 23520, GET_ST), null);
  assertEquals(mapFiscal(TENANT, 23520, null), null);
  assertEquals(mapFiscal(TENANT, 23520, [GET_ST]), null);
});

Deno.test("cores: normaliza, deduplica por id e descarta invalidas", () => {
  const rows = normalizeCores([
    { Id: 1, NomeCor: "AZUL", SiglaCor: "AZ", Descricao: "Azul", UrlCor: "https://x/azul-pai.jpg" },
    { Id: 36, NomeCor: "CREME", SiglaCor: null, Descricao: null, UrlCor: "" },
    { Id: 1, NomeCor: "AZUL MARINHO", SiglaCor: "AZ", Descricao: null },
    { Id: 0, NomeCor: "INVALIDA" },
    { Id: 9, NomeCor: "" },
    null,
    "lixo",
  ], "2026-11-21T12:00:00.000Z");

  assertEquals(rows.length, 2);
  assertEquals(rows[0], {
    id: 1,
    nome: "AZUL MARINHO",
    sigla: "AZ",
    descricao: null,
    last_synced_at: "2026-11-21T12:00:00.000Z",
  });
  assertEquals(rows[1].id, 36);
  assertEquals(rows[1].sigla, null);
  // UrlCor nao tem coluna em xbz_cores: fica fora da linha.
  assertEquals(Object.keys(rows[1]).includes("url"), false);
});

Deno.test("cores: resposta que nao e lista vira lista vazia", () => {
  assertEquals(normalizeCores(null), []);
  assertEquals(normalizeCores({ Id: 1, NomeCor: "AZUL" }), []);
  assertEquals(normalizeCores([]), []);
});
