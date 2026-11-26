import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  dedupePattern,
  FOLLOW_UP_AFTER_HOURS,
  FOLLOW_UP_DEDUPE_HOURS,
  isStale,
  quoteMarker,
  shouldSendFollowUp,
} from "./cotacaoFollowUp.ts";

const NOW = new Date("2026-11-22T12:00:00Z");

Deno.test("quoteMarker usa o numero quando existe", () => {
  assertEquals(quoteMarker("COT-1", "id-x"), "#COT-1 ");
});

Deno.test("quoteMarker cai para o id quando falta numero", () => {
  assertEquals(quoteMarker(null, "id-x"), "#id-x ");
  assertEquals(quoteMarker("   ", "id-x"), "#id-x ");
});

Deno.test("dedupePattern nao casa numero que apenas comeca igual", () => {
  const p = dedupePattern("COT-1", "id-1");
  assertEquals(p, "%#COT-1 %");
  // O bug antigo: `%COT-1%` casava `#COT-12 `. O espaco final impede.
  assertEquals("%#COT-12 ".includes("#COT-1 "), false);
});

Deno.test("dedupePattern escapa curingas do numero", () => {
  assertEquals(dedupePattern("COT_1", "id-1"), "%#COT\\_1 %");
  assertEquals(dedupePattern("COT%1", "id-1"), "%#COT\\%1 %");
});

Deno.test("shouldSendFollowUp exige destinatario", () => {
  const r = shouldSendFollowUp({ id: "1", numero: "C1", created_at: null }, null, null, NOW);
  assertEquals(r, { shouldNotify: false, reason: "sem_destinatario" });
});

Deno.test("shouldSendFollowUp envia quando nunca houve follow-up", () => {
  const r = shouldSendFollowUp({ id: "1", numero: "C1", created_at: null }, "u1", null, NOW);
  assertEquals(r, { shouldNotify: true });
});

Deno.test("shouldSendFollowUp bloqueia dentro da janela de dedupe", () => {
  const r = shouldSendFollowUp(
    { id: "1", numero: "C1", created_at: null },
    "u1",
    new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    NOW,
  );
  assertEquals(r, { shouldNotify: false, reason: "recente_duplicada" });
});

Deno.test("shouldSendFollowUp volta a enviar depois da janela de dedupe", () => {
  const r = shouldSendFollowUp(
    { id: "1", numero: "C1", created_at: null },
    "u1",
    new Date(NOW.getTime() - (FOLLOW_UP_DEDUPE_HOURS + 1) * 60 * 60 * 1000).toISOString(),
    NOW,
  );
  assertEquals(r, { shouldNotify: true });
});

Deno.test("shouldSendFollowUp ignora data de follow-up invalida", () => {
  const r = shouldSendFollowUp({ id: "1", numero: "C1", created_at: null }, "u1", "lixo", NOW);
  assertEquals(r, { shouldNotify: true });
});

Deno.test("isStale respeita a janela de 48h", () => {
  const recente = { id: "1", numero: "C1", created_at: new Date(NOW.getTime() - 47 * 3600_000).toISOString() };
  const antiga = { id: "2", numero: "C2", created_at: new Date(NOW.getTime() - 49 * 3600_000).toISOString() };
  assertEquals(isStale(recente, NOW), false);
  assertEquals(isStale(antiga, NOW), true);
  assertEquals(FOLLOW_UP_AFTER_HOURS, 48);
});

Deno.test("isStale tolera created_at ausente ou invalido", () => {
  assertEquals(isStale({ id: "1", numero: null, created_at: null }, NOW), false);
  assertEquals(isStale({ id: "1", numero: null, created_at: "lixo" }, NOW), false);
});
