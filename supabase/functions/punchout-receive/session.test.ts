// Deno tests para o TTL da sessao PunchOut.
//
// Regressao coberta: punchout-receive rejeitava 100% das sessoes legitimas com
// 409 porque comparava session.status !== "open", enquanto punchout-setup grava
// "opened" (CHECK IN ('opened','completed','cancelled','error')). A checagem de
// expiracao tambem lia session.expires_at, coluna que nao existe na tabela.
//
// Run with: deno test --allow-env supabase/functions/punchout-receive
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getSessionTtlMinutes, isPunchOutSessionExpired } from "./session.ts";

const now = new Date("2026-11-17T12:00:00.000Z");

Deno.test("sessao recem-criada nao expira", () => {
  assertEquals(isPunchOutSessionExpired("2026-11-17T11:59:00.000Z", now, 1440), false);
});

Deno.test("sessao dentro do TTL nao expira", () => {
  assertEquals(isPunchOutSessionExpired("2026-11-16T12:30:00.000Z", now, 1440), false);
});

Deno.test("sessao mais velha que o TTL expira", () => {
  assertEquals(isPunchOutSessionExpired("2026-11-15T12:00:00.000Z", now, 1440), true);
});

Deno.test("limite exato do TTL ainda e valido", () => {
  assertEquals(isPunchOutSessionExpired("2026-11-16T12:00:00.000Z", now, 1440), false);
});

Deno.test("created_at ausente ou invalido nao bloqueia o carrinho", () => {
  assertEquals(isPunchOutSessionExpired(null, now, 1440), false);
  assertEquals(isPunchOutSessionExpired(undefined, now, 1440), false);
  assertEquals(isPunchOutSessionExpired("nao-e-data", now, 1440), false);
});

Deno.test("TTL vem da env quando valida, senao usa 1440", () => {
  const prev = Deno.env.get("PUNCHOUT_SESSION_TTL_MINUTES");
  try {
    Deno.env.set("PUNCHOUT_SESSION_TTL_MINUTES", "30");
    assertEquals(getSessionTtlMinutes(), 30);
    Deno.env.set("PUNCHOUT_SESSION_TTL_MINUTES", "0");
    assertEquals(getSessionTtlMinutes(), 1440);
    Deno.env.set("PUNCHOUT_SESSION_TTL_MINUTES", "abc");
    assertEquals(getSessionTtlMinutes(), 1440);
  } finally {
    if (prev === undefined) Deno.env.delete("PUNCHOUT_SESSION_TTL_MINUTES");
    else Deno.env.set("PUNCHOUT_SESSION_TTL_MINUTES", prev);
  }
});
