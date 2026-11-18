// Deno unit tests for the consecutive-failure detection logic.
// Run: deno test --allow-env --allow-read supabase/functions/check-sla-alerts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { countConsecutiveFailures, detectConsecutiveFailures } from "./failures.ts";

Deno.test("countConsecutiveFailures: 0 quando não há falhas", () => {
  assertEquals(countConsecutiveFailures([
    { status: "success", created_at: "2026-11-18T10:00:00Z" },
  ]), 0);
});

Deno.test("countConsecutiveFailures: conta falhas até o primeiro sucesso", () => {
  assertEquals(countConsecutiveFailures([
    { status: "error", created_at: "2026-11-18T10:30:00Z" },
    { status: "error", created_at: "2026-11-18T10:00:00Z" },
    { status: "success", created_at: "2026-11-18T09:30:00Z" },
    { status: "error", created_at: "2026-11-18T09:00:00Z" },
  ]), 2);
});

Deno.test("detectConsecutiveFailures: ignora abaixo do limiar", () => {
  const rows = [
    { key: "listagem_produtos", status: "error", created_at: "2026-11-18T10:30:00Z" },
    { key: "listagem_produtos", status: "error", created_at: "2026-11-18T10:00:00Z" },
    { key: "listagem_produtos", status: "success", created_at: "2026-11-18T09:30:00Z" },
  ];
  assertEquals(detectConsecutiveFailures(rows, 3, 6 * 60 * 60 * 1000, Date.parse("2026-11-18T11:00:00Z")), []);
});

Deno.test("detectConsecutiveFailures: alerta após 3+ falhas consecutivas recentes", () => {
  const rows = [
    { key: "listagem_produtos", status: "error", created_at: "2026-11-18T10:30:00Z" },
    { key: "listagem_produtos", status: "error", created_at: "2026-11-18T10:00:00Z" },
    { key: "listagem_produtos", status: "error", created_at: "2026-11-18T09:30:00Z" },
  ];
  const result = detectConsecutiveFailures(rows, 3, 6 * 60 * 60 * 1000, Date.parse("2026-11-18T11:00:00Z"));
  assertEquals(result.length, 1);
  assertEquals(result[0].key, "listagem_produtos");
  assertEquals(result[0].count, 3);
});

Deno.test("detectConsecutiveFailures: ignora falha velha (fora da janela)", () => {
  const rows = [
    { key: "listagem_produtos", status: "error", created_at: "2026-11-18T02:00:00Z" },
    { key: "listagem_produtos", status: "error", created_at: "2026-11-18T01:00:00Z" },
    { key: "listagem_produtos", status: "error", created_at: "2026-11-18T00:00:00Z" },
  ];
  const result = detectConsecutiveFailures(rows, 3, 6 * 60 * 60 * 1000, Date.parse("2026-11-18T11:00:00Z"));
  assertEquals(result, []);
});

Deno.test("detectConsecutiveFailures: falha atual após sucesso não é consecutiva", () => {
  const rows = [
    { key: "tags", status: "error", created_at: "2026-11-18T10:30:00Z" },
    { key: "tags", status: "success", created_at: "2026-11-18T10:00:00Z" },
    { key: "tags", status: "error", created_at: "2026-11-18T09:30:00Z" },
    { key: "tags", status: "error", created_at: "2026-11-18T09:00:00Z" },
  ];
  const result = detectConsecutiveFailures(rows, 3, 6 * 60 * 60 * 1000, Date.parse("2026-11-18T11:00:00Z"));
  assertEquals(result, []);
});
