/**
 * Testes do gate de credencial do SCIM (QA-047 / EDGA-07).
 *
 * Ao contrario de conformance.test.ts, NAO depende de rede nem de variavel
 * de ambiente: roda em qualquer `deno test` e no CI Linux.
 *
 * deno test supabase/functions/scim-v2/auth.test.ts
 */

import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { evaluateScimGate, sha256Hex, timingSafeEqual } from "./auth.ts";

const GLOBAL = "token-global-de-teste-0123456789";

async function gate(token: string, hashes: unknown[], global: string | undefined) {
  return await evaluateScimGate(token, await sha256Hex(token), hashes, global);
}

Deno.test("timingSafeEqual: iguais e diferentes", () => {
  assertEquals(timingSafeEqual("abc", "abc"), true);
  assertEquals(timingSafeEqual("abc", "abd"), false);
  assertEquals(timingSafeEqual("abc", "abcd"), false);
  assertEquals(timingSafeEqual("", ""), true);
});

Deno.test("sha256Hex e estavel e distingue tokens", async () => {
  const a = await sha256Hex("x");
  assertEquals(a, await sha256Hex("x"));
  assertEquals(a.length, 64);
  assertEquals(a === await sha256Hex("y"), false);
});

Deno.test("token global correto passa quando a tabela de tenants esta vazia", async () => {
  const d = await gate(GLOBAL, [], GLOBAL);
  assertEquals(d, { ok: true, via: "global-token" });
});

Deno.test("token global correto passa mesmo com hashes de tenant presentes", async () => {
  const d = await gate(GLOBAL, [await sha256Hex("outro-token")], GLOBAL);
  assertEquals(d, { ok: true, via: "global-token" });
});

Deno.test("hash por tenant correto passa sem segredo global configurado", async () => {
  const d = await gate("token-da-empresa", [await sha256Hex("token-da-empresa")], undefined);
  assertEquals(d, { ok: true, via: "tenant-hash" });
});

Deno.test("token de tenant passa mesmo com segredo global diferente", async () => {
  const d = await gate("token-da-empresa", [await sha256Hex("token-da-empresa")], GLOBAL);
  assertEquals(d, { ok: true, via: "tenant-hash" });
});

Deno.test("sem nenhuma fonte configurada -> 503 fail-closed", async () => {
  const d = await gate("qualquer", [], undefined);
  assertEquals(d, { ok: false, status: 503, error: "SCIM not configured" });
});

Deno.test("503 tambem quando as fontes existem mas estao vazias", async () => {
  const d = await gate("qualquer", ["", null], "");
  assertEquals(d, { ok: false, status: 503, error: "SCIM not configured" });
});

Deno.test("token errado com fonte configurada -> 401", async () => {
  const d = await gate("token-errado", [], GLOBAL);
  assertEquals(d, { ok: false, status: 401, error: "Unauthorized" });
});

Deno.test("token errado com hash de tenant presente -> 401", async () => {
  const d = await gate("token-errado", [await sha256Hex("token-da-empresa")], GLOBAL);
  assertEquals(d, { ok: false, status: 401, error: "Unauthorized" });
});

Deno.test("valores nao-string em scim_token_hash nao derrubam o gate", async () => {
  const d = await gate(GLOBAL, [null, 42, {}, await sha256Hex("outro"), GLOBAL], GLOBAL);
  assertEquals(d, { ok: true, via: "global-token" });
});

Deno.test("hash de tenant gravado em MAIUSCULAS nao casa (formato e hex minusculo)", async () => {
  // Documenta a limitacao: sha256Hex sempre devolve minusculo, entao um hash
  // gravado em maiusculas nunca casaria. O gerador de token grava minusculo.
  const hash = await sha256Hex("token-da-empresa");
  const d = await gate("token-da-empresa", [hash.toUpperCase()], undefined);
  assertEquals(d, { ok: false, status: 401, error: "Unauthorized" });
});
