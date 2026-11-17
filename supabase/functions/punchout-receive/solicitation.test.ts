// Testes do contrato de insert em `solicitacoes` a partir do carrinho PunchOut.
// Regressão coberta: colunas inexistentes (`requester_id`, `items`) e
// `status: "rascunho"` (viola solicitacoes_status_check) faziam todo carrinho
// recebido falhar no insert.
import { assertEquals, assertThrows } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { buildCartTitle, buildSolicitacaoFromCart, type CartItem } from "./solicitation.ts";

const sessao = { tenant_id: "11111111-1111-1111-1111-111111111111", user_id: "22222222-2222-2222-2222-222222222222" };

const item = (over: Partial<CartItem> = {}): CartItem => ({
  name: "Caneta personalizada",
  quantity: 100,
  price: 1.5,
  currency: "BRL",
  unit: "UN",
  ...over,
});

Deno.test("usa apenas colunas reais de solicitacoes", () => {
  const row = buildSolicitacaoFromCart([item()], sessao, "SOL-000042");
  const colunasReais = new Set([
    "numero", "titulo", "descricao", "tipo", "status", "prioridade", "quantidade",
    "unidade", "valor_estimado", "observacoes", "solicitante_id", "tenant_id", "organization_id",
  ]);
  for (const coluna of Object.keys(row)) {
    assertEquals(colunasReais.has(coluna), true, `coluna inexistente na tabela: ${coluna}`);
  }
  assertEquals("requester_id" in row, false);
  assertEquals("items" in row, false);
});

Deno.test("organization_id vem do perfil, nunca do tenant_id", () => {
  const org = "33333333-3333-3333-3333-333333333333";
  assertEquals(buildSolicitacaoFromCart([item()], sessao, "X", org).organization_id, org);
  // sem perfil com organização, a coluna fica nula em vez de violar a FK
  // solicitacoes_organization_id_fkey -> organizations(id)
  const semOrg = buildSolicitacaoFromCart([item()], sessao, "X");
  assertEquals(semOrg.organization_id, null);
  assertEquals(semOrg.tenant_id, sessao.tenant_id);
});

Deno.test("status respeita solicitacoes_status_check e o guard de escrita", () => {
  const row = buildSolicitacaoFromCart([item()], sessao, "SOL-000001");
  assertEquals(row.status, "pendente");
});

Deno.test("preenche os NOT NULL sem default", () => {
  const row = buildSolicitacaoFromCart([item()], sessao, "SOL-000007");
  assertEquals(row.numero, "SOL-000007");
  assertEquals(row.titulo.length > 0, true);
  assertEquals(row.tipo, "material");
  assertEquals(row.prioridade, "media");
  assertEquals(row.quantidade >= 1, true);
});

Deno.test("agrega quantidade e valor de vários itens", () => {
  const row = buildSolicitacaoFromCart(
    [item({ quantity: 100, price: 1.5 }), item({ name: "Mochila", quantity: 10, price: 90 })],
    sessao,
    "SOL-000002",
  );
  assertEquals(row.quantidade, 110);
  assertEquals(row.valor_estimado, 1050);
  assertEquals(row.titulo, "Carrinho PunchOut — 2 itens");
});

Deno.test("título de item único é o nome do produto", () => {
  assertEquals(buildCartTitle([item({ name: "Mochila azul" })]), "Mochila azul");
});

Deno.test("unidade só é preenchida quando todos os itens concordam", () => {
  assertEquals(buildSolicitacaoFromCart([item(), item({ unit: "UN" })], sessao, "X").unidade, "UN");
  assertEquals(buildSolicitacaoFromCart([item({ unit: "UN" }), item({ unit: "CX" })], sessao, "X").unidade, null);
  assertEquals(buildSolicitacaoFromCart([item({ unit: undefined })], sessao, "X").unidade, null);
});

Deno.test("carrinho sem valor não grava valor_estimado zerado", () => {
  assertEquals(buildSolicitacaoFromCart([item({ price: 0 })], sessao, "X").valor_estimado, null);
});

Deno.test("descrição lista os itens recebidos", () => {
  const row = buildSolicitacaoFromCart([item({ supplier_part_id: "ABC-1" })], sessao, "X");
  assertEquals(row.descricao.includes("Caneta personalizada"), true);
  assertEquals(row.descricao.includes("ABC-1"), true);
  assertEquals(row.descricao.length <= 2000, true);
});

Deno.test("carrinho vazio é rejeitado", () => {
  assertThrows(() => buildSolicitacaoFromCart([], sessao, "X"));
});

Deno.test("título longo é truncado para caber na coluna", () => {
  const row = buildSolicitacaoFromCart([item({ name: "A".repeat(600) })], sessao, "X");
  assertEquals(row.titulo.length, 200);
});