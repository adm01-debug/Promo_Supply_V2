/**
 * Testes da allowlist do `external-db-bridge` (PR 2.1 do plano de
 * integração PIM/Promo Supply V2: a bridge só lê as views de compra do
 * PIM, nunca escreve).
 * Rodar: deno test supabase/functions/_shared/external-bridge-allowlist.test.ts
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assertBridgeRequest, MAX_SELECT_LIMIT } from "./external-bridge-allowlist.ts";

Deno.test("assertBridgeRequest: select em view do PIM na allowlist é permitido", () => {
  const r = assertBridgeRequest({ operation: "select", table: "v_compras_catalogo" });
  assertEquals(r.ok, true);
});

Deno.test("assertBridgeRequest: tabela fora da allowlist retorna 403", () => {
  const r = assertBridgeRequest({ operation: "select", table: "produtos_externos" });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 403);
});

Deno.test("assertBridgeRequest: insert em view do PIM retorna 403 (operação não permitida)", () => {
  const r = assertBridgeRequest({ operation: "insert", table: "v_compras_catalogo" });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 403);
});

Deno.test("assertBridgeRequest: limit acima de MAX_SELECT_LIMIT retorna 400", () => {
  const r = assertBridgeRequest({
    operation: "select",
    table: "v_compras_catalogo",
    limit: MAX_SELECT_LIMIT + 1,
  });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 400);
});

Deno.test("assertBridgeRequest: update em view do PIM retorna 403 (operação não permitida)", () => {
  const r = assertBridgeRequest({ operation: "update", table: "v_compras_catalogo" });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 403);
});

Deno.test("assertBridgeRequest: delete em view do PIM retorna 403 (operação não permitida)", () => {
  const r = assertBridgeRequest({ operation: "delete", table: "v_compras_catalogo" });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 403);
});

Deno.test("assertBridgeRequest: select sem table retorna 400", () => {
  const r = assertBridgeRequest({ operation: "select" });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 400);
});

Deno.test("assertBridgeRequest: countMode inválido retorna 400", () => {
  const r = assertBridgeRequest({
    operation: "select",
    table: "v_compras_catalogo",
    countMode: "inexistente",
  });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 400);
});

Deno.test("assertBridgeRequest: limit exatamente igual a MAX_SELECT_LIMIT é permitido (boundary)", () => {
  const r = assertBridgeRequest({
    operation: "select",
    table: "v_compras_catalogo",
    limit: MAX_SELECT_LIMIT,
  });
  assertEquals(r.ok, true);
});

Deno.test("assertBridgeRequest: filter operator fora da allowlist retorna 400", () => {
  const r = assertBridgeRequest({
    operation: "select",
    table: "v_compras_catalogo",
    filters: { nome: { operator: "fts", value: "x" } },
  });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 400);
});

Deno.test("assertBridgeRequest: filter aninhado sem campo operator é permitido", () => {
  const r = assertBridgeRequest({
    operation: "select",
    table: "v_compras_catalogo",
    filters: { nome: { value: "x" } },
  });
  assertEquals(r.ok, true);
});

Deno.test("assertBridgeRequest: múltiplos filtros, um inválido entre válidos, retorna 400", () => {
  const r = assertBridgeRequest({
    operation: "select",
    table: "v_compras_catalogo",
    filters: {
      sku: { operator: "eq", value: "ABC" },
      nome: { operator: "fts", value: "x" },
      preco: { operator: "gte", value: 10 },
    },
  });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 400);
});

Deno.test("assertBridgeRequest: selectColumns \"*\" e permitido", () => {
  const r = assertBridgeRequest({ operation: "select", table: "v_compras_catalogo", selectColumns: "*" });
  assertEquals(r.ok, true);
});

Deno.test("assertBridgeRequest: selectColumns com lista de colunas simples e permitido", () => {
  const r = assertBridgeRequest({
    operation: "select",
    table: "v_compras_catalogo",
    selectColumns: "sku, nome,preco_faixa",
  });
  assertEquals(r.ok, true);
});

Deno.test("assertBridgeRequest: selectColumns com recurso embutido retorna 400", () => {
  const r = assertBridgeRequest({
    operation: "select",
    table: "v_compras_catalogo",
    selectColumns: "*,tenants(*)",
  });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 400);
});

Deno.test("assertBridgeRequest: selectColumns com alias de recurso embutido retorna 400", () => {
  const r = assertBridgeRequest({
    operation: "select",
    table: "v_compras_catalogo",
    selectColumns: "nome:tabela(*)",
  });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 400);
});

Deno.test("assertBridgeRequest: selectColumns vazio retorna 400", () => {
  const r = assertBridgeRequest({ operation: "select", table: "v_compras_catalogo", selectColumns: "" });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 400);
});

Deno.test("assertBridgeRequest: chave de filtro com separador de query retorna 400", () => {
  const r = assertBridgeRequest({
    operation: "select",
    table: "v_compras_catalogo",
    filters: { "nome&limit": "x" },
  });
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 400);
});

Deno.test("assertBridgeRequest: chave de filtro snake_case e permitida", () => {
  const r = assertBridgeRequest({
    operation: "select",
    table: "v_compras_catalogo",
    filters: { preco_faixa_min: { operator: "gte", value: 10 } },
  });
  assertEquals(r.ok, true);
});

Deno.test("index do bridge envia selectColumns para a allowlist", async () => {
  const src = await Deno.readTextFile(new URL("../external-db-bridge/index.ts", import.meta.url));
  const chamada = src.match(/assertBridgeRequest\(\{[^}]*\}\)/);
  assertEquals(chamada !== null, true);
  assertEquals(chamada ? chamada[0].includes("selectColumns") : false, true);
});
