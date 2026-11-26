/**
 * Testes do espelho de catálogo XBZ (normalização pura, sem rede/banco).
 * Fixtures seguem o schema real observado em 21/11/2026 (DOCS/INTEGRACOES/XBZ.md §4.3).
 * Rodar: deno test supabase/functions/_shared/xbz_catalog_cache.test.ts
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapProduto, normalizeCatalogo } from "./xbz_catalog_cache.ts";
import { toPascalKeys } from "./xbz_client.ts";

const TENANT = "11111111-1111-1111-1111-111111111111";

/** Recorte real de `consultaEstoque` (PascalCase). */
const ITEM_CONSULTA_ESTOQUE = {
  IdProduto: 23520,
  CodigoXbz: "X235202",
  CodigoComposto: "09211-AZU/PRE",
  CodigoAmigavel: "09211",
  Nome: "Caneta Plástica",
  CorPredominante: { Id: 1, NomeCor: "AZUL", SiglaCor: "AZU", Descricao: "", UrlCor: "https://www.xbzbrindes.com.br/img/cores/azul-pai.jpg" },
  PrecoVendaFormatado: "R$ 1,20",
  PrecoVenda: 1.2,
  VendaMinima: 100,
  Multiplos: 50,
  SiteLink: "https://www.xbzbrindes.com.br/produto/09211",
  ImageLink: "https://cdn.xbzbrindes.com.br/img/produtos/09211-AZU.jpg",
  Disponivel: "SIM",
  QtdDisponivel: 0,
  QtdDisponivelExibicao: "8.044",
  IdNcm: 96081000,
  IpiTaxa: 10,
};

Deno.test("mapProduto: lê os nomes reais do consultaEstoque", () => {
  const row = mapProduto(TENANT, ITEM_CONSULTA_ESTOQUE, "2026-11-21T00:00:00.000Z");

  assertEquals(row?.produto_id, 23520);
  assertEquals(row?.sku, "X235202");
  assertEquals(row?.codigo_composto, "09211-AZU/PRE");
  assertEquals(row?.codigo_amigavel, "09211");
  assertEquals(row?.nome, "Caneta Plástica");
  assertEquals(row?.cor_id, 1);
  assertEquals(row?.cor_nome, "AZUL");
  assertEquals(row?.preco, 1.2);
  assertEquals(row?.preco_ipi, 1.32);
  assertEquals(row?.venda_minima, 100);
  assertEquals(row?.multiplos, 50);
  assertEquals(row?.disponivel, "SIM");
  assertEquals(row?.imagem_url, "https://cdn.xbzbrindes.com.br/img/produtos/09211-AZU.jpg");
  assertEquals(row?.last_synced_at, "2026-11-21T00:00:00.000Z");
});

Deno.test("mapProduto: estoque usa QtdDisponivelExibicao quando QtdDisponivel vem 0", () => {
  assertEquals(mapProduto(TENANT, ITEM_CONSULTA_ESTOQUE)?.quantidade_disponivel, 8044);
  assertEquals(
    mapProduto(TENANT, { ...ITEM_CONSULTA_ESTOQUE, QtdDisponivel: 120 })?.quantidade_disponivel,
    120,
  );
  assertEquals(
    mapProduto(TENANT, { IdProduto: 1, QtdDisponivel: 0, QtdDisponivelExibicao: "" })?.quantidade_disponivel,
    0,
  );
});

Deno.test("mapProduto: aceita camelCase bruto do mxbzConsultaEstoque e o PascalCase normalizado", () => {
  const camel = {
    idProduto: 23520,
    codigoXbz: "X235202",
    nome: "Caneta Plástica",
    corPredominante: { id: 1, nomeCor: "AZUL" },
    precoVenda: 1.2,
    qtdDisponivel: 10,
    imageLink: "https://cdn.xbzbrindes.com.br/img/produtos/09211-AZU.jpg",
  };
  for (const raw of [camel, toPascalKeys(camel) as Record<string, unknown>]) {
    const row = mapProduto(TENANT, raw);
    assertEquals(row?.produto_id, 23520);
    assertEquals(row?.sku, "X235202");
    assertEquals(row?.cor_nome, "AZUL");
    assertEquals(row?.preco, 1.2);
    assertEquals(row?.quantidade_disponivel, 10);
    assertEquals(row?.imagem_url, camel.imageLink);
  }
});

Deno.test("mapProduto: aceita a API /clientes/GetListaDeProdutos (cor e quantidade com outros nomes)", () => {
  const row = mapProduto(TENANT, {
    IdProduto: 7,
    CodigoXbz: "X7",
    Nome: "Mochila",
    CorWebPrincipalId: 9,
    CorWebPrincipal: "PRETO",
    PrecoVenda: "45,90",
    QuantidadeDisponivel: 320,
  });
  assertEquals(row?.produto_id, 7);
  assertEquals(row?.cor_id, 9);
  assertEquals(row?.cor_nome, "PRETO");
  assertEquals(row?.preco, 45.9);
  assertEquals(row?.quantidade_disponivel, 320);
  assertEquals(row?.preco_ipi, null);
});

Deno.test("mapProduto: descarta itens sem produto_id válido", () => {
  assertEquals(mapProduto(TENANT, {}), null);
  assertEquals(mapProduto(TENANT, { IdProduto: 0 }), null);
  assertEquals(mapProduto(TENANT, { IdProduto: "abc" }), null);
});

Deno.test("toPascalKeys: converte chaves recursivamente e preserva arrays/primitivos", () => {
  assertEquals(
    toPascalKeys({ idProduto: 1, corPredominante: { nomeCor: "AZUL" }, containers: [{ data: "x" }], n: null }),
    { IdProduto: 1, CorPredominante: { NomeCor: "AZUL" }, Containers: [{ Data: "x" }], N: null },
  );
  assertEquals(toPascalKeys("texto"), "texto");
});

Deno.test("normalizeCatalogo: deduplica por produto_id e ignora lixo", () => {
  const rows = normalizeCatalogo(TENANT, [
    { IdProduto: 1, Nome: "A" },
    { IdProduto: 1, Nome: "A (cor 2)" },
    { IdProduto: 2, Nome: "B" },
    null,
    "texto",
    { Nome: "sem id" },
  ]);
  assertEquals(rows.length, 2);
  assertEquals(rows.map((r) => r.produto_id).sort(), [1, 2]);
  assertEquals(rows.find((r) => r.produto_id === 1)?.nome, "A (cor 2)");
});

Deno.test("normalizeCatalogo: entrada não-array vira lista vazia", () => {
  assertEquals(normalizeCatalogo(TENANT, null), []);
  assertEquals(normalizeCatalogo(TENANT, { IdProduto: 1 }), []);
});

Deno.test("normalizeCatalogo: preserva o payload bruto para auditoria", () => {
  const raw = { IdProduto: 9, Nome: "X", CampoDesconhecido: true };
  const [row] = normalizeCatalogo(TENANT, [raw]);
  assertEquals(row.raw, raw);
  assertEquals(row.tenant_id, TENANT);
});
