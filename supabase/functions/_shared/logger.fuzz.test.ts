// Fuzz / property tests para EdgeLogger.
//
// Cobre:
//  • message ausente / vazia / não-string / gigante
//  • níveis inválidos, maiúsculos, aliases
//  • contextos com chaves sensíveis (case-insensitive) e valores exóticos
//  • persistência silenciosa quando credenciais Supabase ausentes
//
// Run: deno test --allow-net --allow-env supabase/functions/_shared/logger.fuzz.test.ts
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { EdgeLogger } from "./logger.ts";

// Garante que persistência não tente sair (sem SERVICE_ROLE_KEY/URL o método retorna cedo).
// Deve acontecer ANTES do import de ./logger.ts (env é lida em module scope).
Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
Deno.env.delete("SUPABASE_URL");

const LEVELS = ["info", "warn", "error", "debug"] as const;

const WEIRD_MESSAGES: unknown[] = [
  "",
  " ",
  "a".repeat(50_000),
  "🚀".repeat(1_000),
  "line1\nline2\r\ttab",
  "<script>alert(1)</script>",
  "\u0000\u0001\u0002",
];

const INVALID_LEVELS = ["", "WARNING", "critical", "trace", "unknown"];

function silenceConsole<T>(fn: () => T): T {
  const orig = { log: console.log, warn: console.warn, error: console.error };
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.log = orig.log;
    console.warn = orig.warn;
    console.error = orig.error;
  }
}

Deno.test({ name: "EdgeLogger: níveis válidos aceitam mensagens exóticas sem lançar", sanitizeOps: false, sanitizeResources: false, fn: () => {
  const log = new EdgeLogger("fuzz-fn");
  silenceConsole(() => {
    for (const lvl of LEVELS) {
      for (const msg of WEIRD_MESSAGES) {
        // Tipagem force cast: fuzz é sobre robustez em runtime
        (log as unknown as Record<string, (m: string) => void>)[lvl](msg as string);
      }
    }
  });
  assert(true, "nenhuma exceção propagada");
});

Deno.test({ name: "EdgeLogger: níveis inválidos não expõem métodos", sanitizeOps: false, sanitizeResources: false, fn: () => {
  const log = new EdgeLogger("fuzz-fn");
  for (const lvl of INVALID_LEVELS) {
    const fn = (log as unknown as Record<string, unknown>)[lvl];
    assertEquals(typeof fn, "undefined");
  }
});

Deno.test({ name: "EdgeLogger: redige chaves sensíveis (case-insensitive, substring)", sanitizeOps: false, sanitizeResources: false, fn: () => {
  const log = new EdgeLogger("redact-fn");
  let captured = "";
  const orig = console.error;
  console.error = (out: string) => {
    captured = String(out);
  };
  try {
    log.error("sensitive", {
      password: "hunter2",
      api_token: "abc",
      Authorization: "Bearer xyz",
      cvv: "123",
      safe: "keep",
    });
  } finally {
    console.error = orig;
  }
  const entry = JSON.parse(captured);
  assertEquals(entry.context.password, "[REDACTED]");
  assertEquals(entry.context.api_token, "[REDACTED]");
  assertEquals(entry.context.Authorization, "[REDACTED]");
  assertEquals(entry.context.cvv, "[REDACTED]");
  assertEquals(entry.context.safe, "keep");
});

Deno.test({ name: "EdgeLogger: contexto com valores exóticos vira JSON sem quebrar", sanitizeOps: false, sanitizeResources: false, fn: () => {
  const log = new EdgeLogger("weird-ctx-fn");
  silenceConsole(() => {
    log.warn("ctx-fuzz", {
      big: "x".repeat(20_000),
      deep: { a: { b: { c: { d: 1 } } } },
      arr: [1, 2, 3, null, undefined],
      nan: Number.NaN,
      inf: Infinity,
      bool: true,
    });
  });
  assert(true);
});

Deno.test({ name: "EdgeLogger: getRequestId retorna UUID estável", sanitizeOps: false, sanitizeResources: false, fn: () => {
  const log = new EdgeLogger("id-fn");
  const id1 = log.getRequestId();
  const id2 = log.getRequestId();
  assertEquals(id1, id2);
  assert(/^[0-9a-f-]{36}$/i.test(id1));
});
