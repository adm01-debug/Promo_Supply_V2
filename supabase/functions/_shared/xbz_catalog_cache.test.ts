/**
 * Testes do espelho de catálogo XBZ (normalização pura, sem rede/banco).
 * Rodar: deno test supabase/functions/_shared/xbz_catalog_cache.test.ts
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapProduto, normalizeCatalogo } from "./xbz_catalog_cache.ts";

const TENANT = "11111111-1111-1111-1111-111111111111";

Deno.test("mapProduto: normaliza campos principais", () => {
  const row = mapProduto(TENANT, {
    ProdutoId: 42,
    Sku: " ABC-1 ",
    Nome: "Caneta Metálica",
    Preco: "12,50",
    Quantidade: "1.500",
    VendaMinima: 10,
    CorNome: "Azul",
  }, "2026-01-01T00:00:00.000Z");

  assertEquals(row?.produto_id, 42);
  assertEquals(row?.sku, "ABC-1");
  assertEquals(row?.preco, 12.5);
  assertEquals(row?.quantidade_disponivel, 1500);
  assertEquals(row?.venda_minima, 10);
  assertEquals(row?.cor_nome, "Azul");
  assertEquals(row?.last_synced_at, "2026-01-01T00:00:00.000Z");
});

Deno.test("mapProduto: aceita chaves alternativas (Id / Descricao)", () => {
  const row = mapProduto(TENANT, { Id: 7, Descricao: "Mochila" });
  assertEquals(row?.produto_id, 7);
  assertEquals(row?.nome, "Mochila");
});

Deno.test("mapProduto: descarta itens sem produto_id válido", () => {
  assertEquals(mapProduto(TENANT, {}), null);
  assertEquals(mapProduto(TENANT, { ProdutoId: 0 }), null);
  assertEquals(mapProduto(TENANT, { ProdutoId: "abc" }), null);
});

Deno.test("normalizeCatalogo: deduplica por produto_id e ignora lixo", () => {
  const rows = normalizeCatalogo(TENANT, [
    { ProdutoId: 1, Nome: "A" },
    { ProdutoId: 1, Nome: "A (cor 2)" },
    { ProdutoId: 2, Nome: "B" },
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
  assertEquals(normalizeCatalogo(TENANT, { ProdutoId: 1 }), []);
});

Deno.test("normalizeCatalogo: preserva o payload bruto para auditoria", () => {
  const raw = { ProdutoId: 9, Nome: "X", CampoDesconhecido: true };
  const [row] = normalizeCatalogo(TENANT, [raw]);
  assertEquals(row.raw, raw);
  assertEquals(row.tenant_id, TENANT);
});
