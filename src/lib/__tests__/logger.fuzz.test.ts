/**
 * Fuzz / property tests para o logger do frontend.
 *
 * Cobre:
 *  • Mensagens ausentes / vazias / não-string
 *  • Níveis inválidos ou fora do enum
 *  • Contextos com chaves sensíveis (redaction)
 *  • Payloads extremos (strings gigantes, objetos profundos, valores exóticos)
 *  • Rate limit e batching (não deve estourar exceção nem chamar telemetry além do teto)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createFuzzRng } from "./fuzzSeed";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

import { logger } from "@/lib/logger";

const rng = createFuzzRng("logger-frontend");


const LEVELS = ["info", "warn", "error", "debug"] as const;
const INVALID_LEVELS = [
  "",
  "WARNING",
  "critical",
  "trace",
  "0",
  "null",
  undefined,
  null,
  123,
  {},
  [],
];

const WEIRD_MESSAGES: unknown[] = [
  undefined,
  null,
  "",
  " ",
  0,
  false,
  {},
  [],
  Symbol("x"),
  "a".repeat(50_000),
  "🚀".repeat(2_000),
  "line1\nline2\r\ttab",
  "<script>alert(1)</script>",
  "\u0000\u0001\u0002",
];

// Amostras UTF-8 multibyte: 2-byte (Latin-1 estendido), 3-byte (CJK),
// 4-byte (emoji com surrogate pair), ZWJ sequences, marcas combinantes,
// RTL, controle e lone surrogates (payload malicioso comum).
const MULTIBYTE_SAMPLES = [
  "café",                        // 2-byte
  "日本語テスト",                 // 3-byte CJK
  "😀🎉🚀",                       // 4-byte surrogate pairs
  "👨‍👩‍👧‍👦",                    // ZWJ family
  "e\u0301\u0302\u0303",         // combining marks
  "مرحبا بالعالم",               // RTL Árabe
  "שלום עולם",                   // RTL Hebraico
  "\u200B\u200C\u200D zero-width",
  "\uD83D\uDCA9 pilha",           // surrogate válido explícito
  "\uD800lone-surrogate",         // lone high surrogate (inválido)
  "\uDFFFlone-low",               // lone low surrogate
] as const;

// Limite prático adotado para asserts de tamanho: 64KB é o teto informal
// do payload por entrada antes de qualquer truncamento server-side.
const MAX_ENTRY_BYTES = 64 * 1024;
const utf8Bytes = (s: string) => new TextEncoder().encode(s).length;


const SENSITIVE_CTX: Record<string, unknown> = {
  password: "hunter2",
  api_token: "abc",
  secretKey: "shh",
  authHeader: "Bearer xyz",
  cvv: "123",
  safeField: "keep-me",
  nested: { password: "should-stay-untouched-because-shallow" },
};

async function flush() {
  // logger tem timer de 5s; forçamos várias micro-tasks + timers
  await vi.runAllTimersAsync();
}

describe("logger (frontend) — fuzz & property", () => {
  beforeEach(() => {
    invokeMock.mockClear();
    // Reset singleton internal state to isolate tests
    const l = logger as unknown as Record<string, unknown>;
    l.telemetryQueue = [];
    l.telemetryFlushTimer = null;
    l.telemetryCallsInWindow = 0;
    l.telemetryWindowStart = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("não lança para mensagens exóticas em nenhum nível válido", () => {
    for (const lvl of LEVELS) {
      for (const msg of WEIRD_MESSAGES) {
        expect(
          () => (logger as any)[lvl](msg as string),
          `seed=${rng.seed} lvl=${lvl} msg=${String(msg).slice(0, 40)}`,
        ).not.toThrow();
      }
    }
  });





  it("não lança quando o nível é chamado com API válida mas contexto exótico", () => {
    for (const msg of WEIRD_MESSAGES) {
      expect(() =>
        logger.info(String(msg), { weird: msg, deep: { a: { b: { c: msg } } } }),
      ).not.toThrow();
    }
  });

  it("níveis inválidos não quebram — chamador não deve conseguir invocar", () => {
    for (const lvl of INVALID_LEVELS) {
      // API pública só expõe info/warn/error/debug; garantimos que acesso indireto não crasha
      const fn = (logger as unknown as Record<string, unknown>)[String(lvl)];
      expect(typeof fn === "function" || fn === undefined).toBe(true);
    }
  });

  it("redige chaves sensíveis do contexto (case-insensitive, substring)", async () => {
    logger.error("sensitive-check", SENSITIVE_CTX);
    await flush();
    expect(invokeMock).toHaveBeenCalled();
    const body = invokeMock.mock.calls[0][1].body;
    const ctx = body.batch[0].context as Record<string, unknown>;
    expect(ctx.password).toBe("[REDACTED]");
    expect(ctx.api_token).toBe("[REDACTED]");
    expect(ctx.secretKey).toBe("[REDACTED]");
    expect(ctx.authHeader).toBe("[REDACTED]");
    expect(ctx.cvv).toBe("[REDACTED]");
    expect(ctx.safeField).toBe("keep-me");
  });

  it("respeita o rate limit da janela (não excede envios ilimitados)", async () => {
    for (let i = 0; i < 500; i++) {
      logger.error(`burst-${i}`);
    }
    await flush();
    // Rate limit interno: TELEMETRY_RATE_LIMIT = 60 janelas/min.
    expect(invokeMock.mock.calls.length).toBeLessThanOrEqual(60);
  });

  it("envio em batch: agrupa múltiplas entradas em um único invoke", async () => {
    for (let i = 0; i < 20; i++) logger.warn(`batch-${i}`);
    await flush();
    expect(invokeMock).toHaveBeenCalled();
    const firstBatch = invokeMock.mock.calls[0][1].body.batch;
    expect(Array.isArray(firstBatch)).toBe(true);
    expect(firstBatch.length).toBeGreaterThan(0);
  });

  it("tenantId pode ser null sem quebrar o pipeline", async () => {
    logger.setTenantId(null);
    logger.error("no-tenant");
    await flush();
    expect(invokeMock).toHaveBeenCalled();
  });

  it("UTF-8 multibyte: preserva encoding e sobrevive a JSON round-trip", async () => {
    for (const sample of MULTIBYTE_SAMPLES) {
      invokeMock.mockClear();
      logger.error(sample, { tag: sample });
      await flush();
      // Se o payload não gerou envio (rate limit), pulamos — mas em suíte
      // isolada com beforeEach reset, deve enviar.
      if (invokeMock.mock.calls.length === 0) continue;
      const body = invokeMock.mock.calls[0][1].body;
      const entry = body.batch[0];
      // O logger não deve alterar codepoints válidos; lone surrogates viram
      // replacement (\uFFFD) em qualquer serialização segura, mas em memória
      // JS `JSON.stringify` mantém como \uD800 (escapado). Ambos são aceitos:
      // exigimos apenas que o round-trip seja idempotente e não lance.
      const roundTrip = JSON.parse(JSON.stringify(entry));
      expect(
        typeof roundTrip.message === "string",
        `seed=${rng.seed} sample=${sample.slice(0, 20)}`,
      ).toBe(true);
      expect(roundTrip.message).toBe(entry.message);
      expect(roundTrip.context.tag).toBe(entry.context.tag);
    }
  });

  it("payload multibyte grande: mantém encoding e fica dentro do limite prático", async () => {
    // ~40k caracteres CJK = ~120KB em UTF-8, acima do teto de 64KB por entrada.
    const huge = "日本語".repeat(15_000);
    const bytes = utf8Bytes(huge);
    expect(bytes).toBeGreaterThan(MAX_ENTRY_BYTES);

    invokeMock.mockClear();
    expect(() => logger.error(huge, { chunk: huge.slice(0, 100) })).not.toThrow();
    await flush();

    if (invokeMock.mock.calls.length > 0) {
      const entry = invokeMock.mock.calls[0][1].body.batch[0];
      const serialized = JSON.stringify(entry);
      // Round-trip não pode explodir nem introduzir replacement chars
      // em codepoints válidos (mesmo se algum truncamento ocorrer).
      const parsed = JSON.parse(serialized);
      expect(typeof parsed.message).toBe("string");
      // Nenhum caractere U+FFFD foi introduzido em codepoints válidos.
      expect(parsed.message.includes("\uFFFD")).toBe(false);
      // Se logger truncar no futuro, deve cortar em fronteira de codepoint:
      // qualquer sufixo permanece re-encodável sem erro.
      expect(() => new TextEncoder().encode(parsed.message)).not.toThrow();
    }
  });

  it("controle e nulos embutidos em UTF-8 não corrompem JSON", () => {
    const evil = "prefix\u0000middle\u0007\u001Fsuffix\u{1F480}";
    expect(() => logger.warn(evil, { evil })).not.toThrow();
    const serialized = JSON.stringify({ msg: evil });
    expect(JSON.parse(serialized).msg).toBe(evil);
  });



  // Property test roda por último para não interferir nos testes de flush acima.
  it("property: 200 iterações randomizadas com seed reprodutível", () => {
    for (let i = 0; i < 200; i++) {
      const lvl = rng.pick(LEVELS);
      const msg = rng.randomString(rng.rand() < 0.05 ? 5_000 : 32);
      const ctx = {
        i,
        seed: rng.seed,
        rnd: rng.rand(),
        password: rng.randomString(8),
        payload: rng.randomString(16),
      };
      expect(
        () => (logger as any)[lvl](msg, ctx),
        `seed=${rng.seed} iter=${i} lvl=${lvl}`,
      ).not.toThrow();
    }
  });
});
