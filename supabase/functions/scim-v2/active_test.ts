import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { BAN_DURATION_DESATIVADO, estaAtivo, interpretarActive } from "./active.ts";

const AGORA = Date.parse("2026-11-26T12:00:00.000Z");
const FUTURO = new Date(AGORA + 86_400_000).toISOString();
const PASSADO = new Date(AGORA - 86_400_000).toISOString();

Deno.test("interpretarActive aceita booleano dos dois lados", () => {
  assertEquals(interpretarActive(true), true);
  assertEquals(interpretarActive(false), false);
});

Deno.test("interpretarActive aceita a string que alguns IdPs mandam", () => {
  assertEquals(interpretarActive("true"), true);
  assertEquals(interpretarActive(" FALSE "), false);
});

Deno.test("interpretarActive recusa valor que nao e booleano", () => {
  assertEquals(interpretarActive("talvez"), undefined);
  assertEquals(interpretarActive(1), undefined);
  assertEquals(interpretarActive(null), undefined);
  assertEquals(interpretarActive(undefined), undefined);
});

Deno.test("estaAtivo: sem ban e ativo", () => {
  assertEquals(estaAtivo({ banned_until: null }, AGORA), true);
  assertEquals(estaAtivo({}, AGORA), true);
  assertEquals(estaAtivo(null, AGORA), true);
});

Deno.test("estaAtivo: ban no futuro e desativado", () => {
  assertEquals(estaAtivo({ banned_until: FUTURO }, AGORA), false);
});

Deno.test("estaAtivo: ban ja vencido volta a ser ativo", () => {
  assertEquals(estaAtivo({ banned_until: PASSADO }, AGORA), true);
});

Deno.test("estaAtivo: data ilegivel nao tranca o usuario fora", () => {
  assertEquals(estaAtivo({ banned_until: "nao-e-data" }, AGORA), true);
});

Deno.test("BAN_DURATION_DESATIVADO e a duracao longa que o GoTrue aceita", () => {
  assertEquals(BAN_DURATION_DESATIVADO, "876000h");
});