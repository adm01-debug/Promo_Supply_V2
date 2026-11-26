/**
 * Determinismo do parse de datas do XBZ (regressao).
 *
 * O bug: parseXbzDate recebia "2026-11-20T09:15:30" (sem offset) e usava
 * Date.parse direto, que trata a string como hora LOCAL do runtime. Em UTC
 * (producao e CI) virava 09:15:30Z; em America/Sao_Paulo virava 12:15:30Z.
 * O mesmo codigo dava 3h de diferenca conforme quem executava.
 *
 * O fix fixa a ausencia de offset em UTC, que e o que a producao ja gravava,
 * entao nao ha mudanca de dado - so o fim do nao-determinismo.
 * Este teste roda em varias TZ e exige o MESMO resultado.
 *
 * deno test supabase/functions/_shared/xbz_date_tz.test.ts
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parsePagamentoLabel, parseXbzDate } from "./xbz_client.ts";

Deno.test("parseXbzDate: sem offset -> UTC, em qualquer fuso do runtime", () => {
  assertEquals(parseXbzDate("2026-11-20T09:15:30"), "2026-11-20T09:15:30.000Z");
  // Formato com espaco (como o XBZ manda) da o mesmo resultado.
  assertEquals(parseXbzDate("2026-11-20 09:15:30"), "2026-11-20T09:15:30.000Z");
  // Data pura tambem nao desloca.
  assertEquals(parseXbzDate("2026-11-20"), "2026-11-20T00:00:00.000Z");
});

Deno.test("parseXbzDate: valor COM offset e respeitado como veio", () => {
  assertEquals(parseXbzDate("2026-11-20T09:15:30Z"), "2026-11-20T09:15:30.000Z");
  assertEquals(parseXbzDate("2026-11-20T09:15:30+00:00"), "2026-11-20T09:15:30.000Z");
  // Offsets reais do XBZ/PostgREST continuam sendo convertidos, nao reescritos.
  assertEquals(parseXbzDate("2026-11-20T09:15:30-03:00"), "2026-11-20T12:15:30.000Z");
  assertEquals(parseXbzDate("2026-11-20T09:15:30.123456+00:00"), "2026-11-20T09:15:30.123Z");
});

Deno.test("parseXbzDate: sentinela, vazio e lixo continuam null", () => {
  assertEquals(parseXbzDate("2000-01-01T00:00:00"), null);
  assertEquals(parseXbzDate(""), null);
  assertEquals(parseXbzDate(null), null);
  assertEquals(parseXbzDate(42), null);
  assertEquals(parseXbzDate("nao e data"), null);
});

Deno.test("parsePagamentoLabel: determinístico e por ano", () => {
  assertEquals(parsePagamentoLabel("PAGO (20/11/26 09:15:30)"), "2026-11-20T09:15:30.000Z");
  assertEquals(parsePagamentoLabel("PAGO (20/11/26 00:00:00)"), "2026-11-20T00:00:00.000Z");
  assertEquals(parsePagamentoLabel("PAGO (31/12/26 23:59:59)"), "2026-12-31T23:59:59.000Z");
  assertEquals(parsePagamentoLabel("sem data"), null);
  assertEquals(parsePagamentoLabel(null), null);
});

Deno.test("parseXbzDate e parsePagamentoLabel concordam para o mesmo instante", () => {
  // Ambas as fontes vem do mesmo XBZ e agora sao interpretadas do mesmo jeito.
  assertEquals(parseXbzDate("2026-11-20T09:15:30"), parsePagamentoLabel("PAGO (20/11/26 09:15:30)"));
});
