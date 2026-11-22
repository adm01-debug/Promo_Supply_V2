import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isLoginRedirect,
  PORTAL_SESSION_TAG,
  pickPortalSession,
  type SpotSessionRow,
} from "./sessions.ts";

const NOW = Date.parse("2026-11-22T15:00:00.000Z");
const MIN = 60_000;

function row(over: Partial<SpotSessionRow> & { id: string }): SpotSessionRow {
  return {
    session_cookie: `PHPSESSID=${over.id}`,
    is_valid: true,
    last_used_at: new Date(NOW - MIN).toISOString(),
    metadata: { tag: PORTAL_SESSION_TAG },
    ...over,
  };
}

function apiTokenRow(id: string, minutesAgo = 5): SpotSessionRow {
  return {
    id,
    session_cookie: `ws-token-${id}`,
    is_valid: true,
    last_used_at: new Date(NOW - minutesAgo * MIN).toISOString(),
    metadata: { tag: "spot-api-token" },
  };
}

Deno.test("token da API WS nunca é devolvido como cookie de portal", () => {
  const pick = pickPortalSession([apiTokenRow("a")], NOW);
  assertEquals(pick.cookie, null);
  assertEquals(pick.reuseId, null);
});

Deno.test("token da API WS nunca é invalidado ao limpar sessões de portal", () => {
  const pick = pickPortalSession(
    [apiTokenRow("a", 1), apiTokenRow("b", 90), apiTokenRow("c", 100)],
    NOW,
  );
  assertEquals(pick.invalidateIds, []);
});

Deno.test("sessão de portal recente é reutilizada", () => {
  const pick = pickPortalSession([row({ id: "p1", last_used_at: new Date(NOW - 5 * MIN).toISOString() })], NOW);
  assertEquals(pick.cookie, "PHPSESSID=p1");
  assertEquals(pick.reuseId, "p1");
  assertEquals(pick.invalidateIds, []);
});

Deno.test("sessão de portal com mais de 30 min força novo login", () => {
  const pick = pickPortalSession([row({ id: "p1", last_used_at: new Date(NOW - 31 * MIN).toISOString() })], NOW);
  assertEquals(pick.cookie, null);
  assertEquals(pick.invalidateIds, ["p1"]);
});

Deno.test("last_used_at ausente é tratado como expirado (fail-closed)", () => {
  const pick = pickPortalSession([row({ id: "p1", last_used_at: null })], NOW);
  assertEquals(pick.cookie, null);
  assertEquals(pick.invalidateIds, ["p1"]);
});

Deno.test("last_used_at inválido é tratado como expirado", () => {
  const pick = pickPortalSession([row({ id: "p1", last_used_at: "nao-e-data" })], NOW);
  assertEquals(pick.cookie, null);
});

Deno.test("metadata nulo não é confundido com sessão de portal", () => {
  const pick = pickPortalSession([row({ id: "x", metadata: null })], NOW);
  assertEquals(pick.cookie, null);
  assertEquals(pick.invalidateIds, []);
});

Deno.test("apenas as sessões de portal excedentes são invalidadas", () => {
  const pick = pickPortalSession(
    [
      row({ id: "p1", last_used_at: new Date(NOW - 1 * MIN).toISOString() }),
      row({ id: "p2", last_used_at: new Date(NOW - 2 * MIN).toISOString() }),
      row({ id: "p3", last_used_at: new Date(NOW - 3 * MIN).toISOString() }),
      apiTokenRow("api"),
    ],
    NOW,
  );
  assertEquals(pick.cookie, "PHPSESSID=p1");
  assertEquals(pick.reuseId, "p1");
  assertEquals(pick.invalidateIds, ["p2", "p3"]);
  assert(!pick.invalidateIds.includes("api"));
});

Deno.test("ttl customizado é respeitado", () => {
  const rows = [row({ id: "p1", last_used_at: new Date(NOW - 2 * MIN).toISOString() })];
  assertEquals(pickPortalSession(rows, NOW, 1 * MIN).cookie, null);
  assertEquals(pickPortalSession(rows, NOW, 3 * MIN).cookie, "PHPSESSID=p1");
});

Deno.test("isLoginRedirect reconhece redirect para login e área reservada", () => {
  assert(isLoginRedirect("https://www.spotgifts.com.br/pt/area-reservada/login/"));
  assert(isLoginRedirect("/pt/login"));
  assertEquals(isLoginRedirect(null), false);
  assertEquals(isLoginRedirect(""), false);
  // Herdado: qualquer redirect para a area reservada refaz o login (fail-closed).
  assertEquals(isLoginRedirect("https://www.spotgifts.com.br/pt/area-reservada/pedidos/"), true);
});
