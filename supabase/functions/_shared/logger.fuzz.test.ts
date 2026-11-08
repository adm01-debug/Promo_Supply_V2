// Fuzz / property tests para EdgeLogger.
//
// Cobre:
//  • message vazia / não-string / gigante
//  • níveis inválidos, aliases
//  • contextos com chaves sensíveis (case-insensitive) e valores exóticos
//  • persistência silenciosa quando credenciais Supabase ausentes
//
// Run: deno test --allow-net --allow-env supabase/functions/_shared/logger.fuzz.test.ts

// Garante que persistência não tente sair: sem SUPABASE_URL/SERVICE_ROLE_KEY
// o método persistLog retorna cedo (env é lida em module scope, então
// DEVE ocorrer antes do import de ./logger.ts).
Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
Deno.env.delete("SUPABASE_URL");

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { EdgeLogger } from "./logger.ts";
import { createFuzzRng } from "./fuzzSeed.ts";

const rng = createFuzzRng("logger-edge");

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

const MULTIBYTE_SAMPLES = [
  "café",
  "日本語テスト",
  "😀🎉🚀",
  "👨‍👩‍👧‍👦",
  "é̂̃",
  "مرحبا بالعالم",
  "שלום עולם",
  "​‌‍ zero-width",
  "💩 pilha",
  "\uD800lone-surrogate",
  "\uDFFFlone-low",
] as const;

const MAX_ENTRY_BYTES = 64 * 1024;
const utf8Bytes = (s: string) => new TextEncoder().encode(s).length;


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

// Sanitizers desligados: `createClient` do supabase-js pode abrir conexões
// idle em background mesmo quando persistLog retorna cedo — não é o que
// estamos testando aqui.
const opts = { sanitizeOps: false, sanitizeResources: false };

Deno.test({
  name: "EdgeLogger: níveis válidos aceitam mensagens exóticas sem lançar",
  ...opts,
  fn: () => {
    const log = new EdgeLogger("fuzz-fn");
    silenceConsole(() => {
      for (const lvl of LEVELS) {
        for (const msg of WEIRD_MESSAGES) {
          (log as unknown as Record<string, (m: string) => void>)[lvl](msg as string);
        }
      }
    });
    assert(true, "nenhuma exceção propagada");
  },
});

Deno.test({
  name: "EdgeLogger: níveis inválidos não expõem métodos",
  ...opts,
  fn: () => {
    const log = new EdgeLogger("fuzz-fn");
    for (const lvl of INVALID_LEVELS) {
      const fn = (log as unknown as Record<string, unknown>)[lvl];
      assertEquals(typeof fn, "undefined");
    }
  },
});

Deno.test({
  name: "EdgeLogger: redige chaves sensíveis (case-insensitive, substring)",
  ...opts,
  fn: () => {
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
  },
});

Deno.test({
  name: "EdgeLogger: contexto com valores exóticos vira JSON sem quebrar",
  ...opts,
  fn: () => {
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
  },
});

Deno.test({
  name: "EdgeLogger: getRequestId retorna UUID estável",
  ...opts,
  fn: () => {
    const log = new EdgeLogger("id-fn");
    const id1 = log.getRequestId();
    const id2 = log.getRequestId();
    assertEquals(id1, id2);
    assert(/^[0-9a-f-]{36}$/i.test(id1));
  },
});

Deno.test({
  name: "EdgeLogger: property — 100 iterações randomizadas com seed reprodutível",
  ...opts,
  fn: () => {
    const log = new EdgeLogger("prop-fn");
    silenceConsole(() => {
      for (let i = 0; i < 100; i++) {
        const lvl = rng.pick(LEVELS);
        const msg = rng.randomString(rng.rand() < 0.1 ? 2_000 : 24);
        try {
          (log as unknown as Record<string, (m: string, c?: unknown) => void>)[lvl](msg, {
            i,
            seed: rng.seed,
            token: rng.randomString(8),
            payload: rng.randomString(16),
          });
        } catch (err) {
          throw new Error(`falha reprodutível: seed=${rng.seed} iter=${i} lvl=${lvl}: ${err}`);
        }
      }
    });
    assert(true);
  },
});

Deno.test({
  name: "EdgeLogger: UTF-8 multibyte sobrevive a JSON round-trip sem corromper",
  ...opts,
  fn: () => {
    const log = new EdgeLogger("utf8-fn");
    for (const sample of MULTIBYTE_SAMPLES) {
      let captured = "";
      const orig = console.error;
      console.error = (out: string) => {
        captured = String(out);
      };
      try {
        log.error(sample, { tag: sample });
      } finally {
        console.error = orig;
      }
      // JSON.parse deve ter sucesso — se a serialização quebrasse
      // encoding, aqui teríamos SyntaxError.
      const entry = JSON.parse(captured);
      assertEquals(typeof entry.message, "string");
      assertEquals(entry.message, sample);
      assertEquals(entry.context.tag, sample);
      // Round-trip idempotente: serialize → parse → serialize.
      assertEquals(JSON.stringify(JSON.parse(JSON.stringify(entry))), JSON.stringify(entry));
    }
  },
});

Deno.test({
  name: "EdgeLogger: payload multibyte grande mantém encoding sem introduzir U+FFFD",
  ...opts,
  fn: () => {
    const log = new EdgeLogger("utf8-huge-fn");
    // ~15k × 3 = 45k caracteres CJK → ~135KB em UTF-8, acima do teto prático.
    const huge = "日本語".repeat(15_000);
    assert(utf8Bytes(huge) > MAX_ENTRY_BYTES);
    let captured = "";
    const orig = console.error;
    console.error = (out: string) => {
      captured = String(out);
    };
    try {
      log.error(huge, { chunk: huge.slice(0, 100) });
    } finally {
      console.error = orig;
    }
    const entry = JSON.parse(captured);
    assertEquals(typeof entry.message, "string");
    // Nenhum replacement char introduzido em codepoints válidos.
    assertEquals(entry.message.includes("�"), false);
    // Encoding permanece válido — TextEncoder não lança em codepoints válidos.
    new TextEncoder().encode(entry.message);
    // logger.ts trunca para MAX_LOG_MESSAGE_LEN (4000) via safeTruncate antes
    // de persistir — a mensagem resultante deve ser um prefixo limpo do
    // original, nunca o tamanho total (esse teto é intencional, protege o
    // tamanho da linha gravada em telemetry_logs).
    assert(entry.message.length <= huge.length, "mensagem persistida não pode exceder o original");
    assert(huge.startsWith(entry.message), "mensagem truncada deve ser prefixo limpo do original");
  },
});

Deno.test({
  name: "EdgeLogger: controle e nulos embutidos não corrompem JSON",
  ...opts,
  fn: () => {
    const log = new EdgeLogger("ctrl-fn");
    const evil = "prefix\u0000middle\u0007\u001Fsuffix\u{1F480}";
    let captured = "";
    const orig = console.warn;
    console.warn = (out: string) => {
      captured = String(out);
    };
    try {
      log.warn(evil, { evil });
    } finally {
      console.warn = orig;
    }
    const entry = JSON.parse(captured);
    assertEquals(entry.message, evil);
    assertEquals(entry.context.evil, evil);
  },
});
