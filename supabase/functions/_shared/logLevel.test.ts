/**
 * Matriz de property tests para `normalizeLevel` e `buildTelemetryRow`.
 *
 * Cobre:
 *   1. Matriz determinística de mapeamento inválido → default ("info").
 *   2. Preservação case/whitespace-insensível dos níveis canônicos.
 *   3. Alias "warning" → "warn" (todas variações).
 *   4. Property test: qualquer entrada aleatória SEMPRE retorna um dos
 *      níveis canônicos (idempotência: normalize(x) === normalize(normalize(x))).
 *   5. Formato final do payload gravado em `telemetry_logs`
 *      (chaves, tipos, truncamento de message, fallbacks).
 *
 * Reproduza uma falha com: FUZZ_SEED=<n> deno test --allow-env --allow-net <arquivo>
 */

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  buildTelemetryRow,
  CANONICAL_LEVELS,
  DEFAULT_LEVEL,
  MAX_MESSAGE_LENGTH,
  normalizeLevel,
  safeTruncate,
  type CanonicalLogLevel,
} from "./logLevel.ts";
import { createFuzzRng } from "./fuzzSeed.ts";

const REQUEST_ID = "00000000-0000-0000-0000-000000000000";
const USER_ID = "user-1";
const TENANT_ID = "tenant-1";

// --------------------------------------------------------------------------
// 1. Matriz determinística de entradas inválidas → default
// --------------------------------------------------------------------------

const INVALID_LEVELS: readonly unknown[] = [
  null,
  undefined,
  "",
  "   ",
  "trace",
  "fatal",
  "verbose",
  "critical",
  "notice",
  "ERR", // não é alias — mapeia para default
  "WARN!", // pontuação quebra o match
  "info ok",
  0,
  1,
  42,
  NaN,
  Infinity,
  true,
  false,
  [],
  ["error"],
  { level: "error" },
  Symbol("error"),
];

Deno.test("normalizeLevel: matriz de entradas inválidas mapeia para DEFAULT_LEVEL", () => {
  for (const input of INVALID_LEVELS) {
    const got = normalizeLevel(input);
    assertEquals(
      got,
      DEFAULT_LEVEL,
      `esperado "${DEFAULT_LEVEL}" para input=${String(input)?.slice?.(0, 40)}, recebido "${got}"`,
    );
  }
});

// --------------------------------------------------------------------------
// 2. Preservação case-insensitive + whitespace dos canônicos
// --------------------------------------------------------------------------

Deno.test("normalizeLevel: níveis canônicos aceitam variações case/whitespace", () => {
  for (const lv of CANONICAL_LEVELS) {
    const variants = [
      lv,
      lv.toUpperCase(),
      `  ${lv}  `,
      `\t${lv}\n`,
      lv.split("").map((c, i) => (i % 2 ? c.toUpperCase() : c)).join(""),
    ];
    for (const v of variants) {
      assertEquals(normalizeLevel(v), lv, `variação "${v}" deveria virar "${lv}"`);
    }
  }
});

// --------------------------------------------------------------------------
// 3. Alias "warning" → "warn"
// --------------------------------------------------------------------------

Deno.test('normalizeLevel: alias "warning" mapeia para "warn"', () => {
  for (const v of ["warning", "WARNING", "  Warning  ", "wArNiNg"]) {
    assertEquals(normalizeLevel(v), "warn", `alias "${v}"`);
  }
});

// --------------------------------------------------------------------------
// 4. Property test: totalidade + idempotência do domínio
// --------------------------------------------------------------------------

Deno.test("property: normalizeLevel é total e idempotente sobre 500 inputs aleatórios", () => {
  const { rand, pick, randomString, seed } = createFuzzRng("normalizeLevel");
  const canonicalSet = new Set<CanonicalLogLevel>(CANONICAL_LEVELS);

  for (let i = 0; i < 500; i++) {
    // mix: canonical, alias, ruído estruturado, string aleatória, valores exóticos
    const bucket = Math.floor(rand() * 6);
    let input: unknown;
    switch (bucket) {
      case 0: input = pick(CANONICAL_LEVELS); break;
      case 1: input = pick(["warning", "WARNING", "Warn"]); break;
      case 2: input = randomString(Math.floor(rand() * 20)); break;
      case 3: input = Math.floor(rand() * 100); break;
      case 4: input = rand() < 0.5 ? null : undefined; break;
      default: input = { junk: randomString(8) };
    }

    const once = normalizeLevel(input);
    const twice = normalizeLevel(once);

    assert(
      canonicalSet.has(once),
      `seed=${seed} iter=${i} input=${String(input).slice(0, 40)} → "${once}" fora do conjunto canônico`,
    );
    assertEquals(
      twice,
      once,
      `seed=${seed} iter=${i} idempotência violada: normalize(normalize(x))="${twice}" !== "${once}"`,
    );
  }
});

// --------------------------------------------------------------------------
// 5. Formato final do payload persistido
// --------------------------------------------------------------------------

const EXPECTED_ROW_KEYS = [
  "level",
  "message",
  "context",
  "request_id",
  "user_id",
  "tenant_id",
  "url",
  "user_agent",
  "client_ip",
].sort();

Deno.test("buildTelemetryRow: descarta entradas sem message string não-vazia", () => {
  const cases: unknown[] = [
    null,
    undefined,
    {},
    { message: "" },
    { message: 123 },
    { message: null },
    "string bruta",
    42,
  ];
  for (const raw of cases) {
    const row = buildTelemetryRow({
      raw: raw as Record<string, unknown>,
      fallbackRequestId: REQUEST_ID,
      userId: USER_ID,
    });
    assertEquals(row, null, `esperado null para ${JSON.stringify(raw)}`);
  }
});

Deno.test("buildTelemetryRow: payload possui exatamente as chaves esperadas com tipos corretos", () => {
  const row = buildTelemetryRow({
    raw: {
      message: "hello",
      level: "warning",
      context: { foo: "bar" },
      requestId: "req-123",
      tenantId: "tenant-x",
      url: "https://app/x",
      userAgent: "UA/1.0",
    },
    fallbackRequestId: REQUEST_ID,
    userId: USER_ID,
    fallbackTenantId: TENANT_ID,
    clientIp: "1.2.3.4",
  });

  assert(row !== null);
  assertEquals(Object.keys(row).sort(), EXPECTED_ROW_KEYS);
  assertEquals(row.level, "warn"); // alias aplicado
  assertEquals(row.message, "hello");
  assertEquals(row.context, { foo: "bar" });
  assertEquals(row.request_id, "req-123");
  assertEquals(row.user_id, USER_ID);
  assertEquals(row.tenant_id, "tenant-x");
  assertEquals(row.url, "https://app/x");
  assertEquals(row.user_agent, "UA/1.0");
  assertEquals(row.client_ip, "1.2.3.4");
});

Deno.test("buildTelemetryRow: aplica fallbacks quando campos opcionais faltam ou têm tipos errados", () => {
  const row = buildTelemetryRow({
    raw: {
      message: "m",
      level: "🚀invalido",
      context: "não é objeto",
      requestId: 999,
      tenantId: "",
      url: { not: "string" },
      userAgent: null,
    },
    fallbackRequestId: REQUEST_ID,
    userId: null,
    fallbackTenantId: TENANT_ID,
    clientIp: null,
  });

  assert(row !== null);
  assertEquals(row.level, DEFAULT_LEVEL);
  assertEquals(row.context, null);
  assertEquals(row.request_id, REQUEST_ID);
  assertEquals(row.tenant_id, TENANT_ID);
  assertEquals(row.url, null);
  assertEquals(row.user_agent, null);
  assertEquals(row.user_id, null);
  assertEquals(row.client_ip, null);
});

Deno.test("buildTelemetryRow: trunca message em MAX_MESSAGE_LENGTH preservando início", () => {
  const long = "A".repeat(MAX_MESSAGE_LENGTH + 500);
  const row = buildTelemetryRow({
    raw: { message: long },
    fallbackRequestId: REQUEST_ID,
    userId: USER_ID,
  });
  assert(row !== null);
  assertEquals(row.message.length, MAX_MESSAGE_LENGTH);
  assertEquals(row.message[0], "A");
});

Deno.test("property: buildTelemetryRow sempre produz payload JSON-serializável com chaves esperadas", () => {
  const { rand, pick, randomString, seed } = createFuzzRng("buildTelemetryRow");

  for (let i = 0; i < 200; i++) {
    const raw: Record<string, unknown> = {
      message: rand() < 0.15 ? "" : randomString(1 + Math.floor(rand() * 32)),
      level: pick([...CANONICAL_LEVELS, "warning", "bogus", null, 42, {}]),
      context: pick([undefined, null, { a: 1 }, "str", ["x"], 42]),
      requestId: pick([undefined, "", "req-" + i, 123]),
      tenantId: pick([undefined, "", "t-" + i, null]),
      url: pick([undefined, null, "https://x/" + i, 5]),
      userAgent: pick([undefined, null, "UA " + i, {}]),
    };

    const row = buildTelemetryRow({
      raw,
      fallbackRequestId: REQUEST_ID,
      userId: rand() < 0.5 ? USER_ID : null,
      fallbackTenantId: rand() < 0.5 ? TENANT_ID : null,
      clientIp: rand() < 0.5 ? "9.9.9.9" : null,
    });

    if (row === null) {
      assert(
        typeof raw.message !== "string" || raw.message.length === 0,
        `seed=${seed} iter=${i} row null com message válida`,
      );
      continue;
    }

    assertEquals(
      Object.keys(row).sort(),
      EXPECTED_ROW_KEYS,
      `seed=${seed} iter=${i} chaves divergentes`,
    );
    assert(
      CANONICAL_LEVELS.includes(row.level),
      `seed=${seed} iter=${i} level fora do canônico: ${row.level}`,
    );
    assert(row.message.length <= MAX_MESSAGE_LENGTH);
    assert(row.context === null || (typeof row.context === "object" && !Array.isArray(row.context)));

    // JSON round-trip precisa ser estável (nada de BigInt/Symbol vazando)
    const json = JSON.stringify(row);
    const parsed = JSON.parse(json);
    assertEquals(parsed.level, row.level);
    assertEquals(parsed.message, row.message);
  }
});

// --------------------------------------------------------------------------
// 6. UTF-8 multibyte: truncamento + encoding preservado, JSON válido
// --------------------------------------------------------------------------

const REPLACEMENT = "\uFFFD"; // U+FFFD REPLACEMENT CHARACTER

const MULTIBYTE_SAMPLES: readonly { name: string; text: string }[] = [
  { name: "2-byte Latin-1",        text: "áéíóú çãõ ñü ¿¡" },
  { name: "3-byte CJK",            text: "日本語テスト 中文测试 한국어" },
  { name: "4-byte emoji (surrogate pair)", text: "🚀🔥💾🧪🌈" },
  { name: "ZWJ family sequence",   text: "👨‍👩‍👧‍👦 👩🏽‍💻 🏳️‍🌈" },
  { name: "combining marks",       text: "e\u0301 a\u0300 o\u0302 n\u0303" },
  { name: "RTL scripts",           text: "مرحبا بالعالم שלום עולם" },
  { name: "control + emoji",       text: "a\u0000b\u0007c\u001Fd🚀" },
];

Deno.test("safeTruncate: preserva encoding UTF-8 e evita lone surrogates", () => {
  for (const { name, text } of MULTIBYTE_SAMPLES) {
    for (const cap of [1, 2, 3, 8, 16, 64, text.length, text.length - 1]) {
      if (cap <= 0) continue;
      const out = safeTruncate(text, cap);
      assert(out.length <= cap, `${name} @${cap}: length ${out.length} > cap`);

      // Não deve haver lone high surrogate como último code unit
      const last = out.charCodeAt(out.length - 1);
      assert(
        !(last >= 0xd800 && last <= 0xdbff),
        `${name} @${cap}: terminou em lone high surrogate 0x${last.toString(16)}`,
      );

      // Round-trip JSON estável
      const parsed = JSON.parse(JSON.stringify(out));
      assertEquals(parsed, out, `${name} @${cap}: JSON round-trip divergente`);

      // TextEncoder não deve introduzir U+FFFD (input era válido)
      const bytes = new TextEncoder().encode(out);
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      assert(
        !decoded.includes(REPLACEMENT),
        `${name} @${cap}: encoding produziu U+FFFD`,
      );
    }
  }
});

Deno.test("buildTelemetryRow: mensagens multibyte não corrompem payload nem JSON", () => {
  for (const { name, text } of MULTIBYTE_SAMPLES) {
    const row = buildTelemetryRow({
      raw: { message: text, level: "info", context: { label: text } },
      fallbackRequestId: REQUEST_ID,
      userId: USER_ID,
    });
    assert(row !== null, `${name}: row nulo`);
    assertEquals(row.message, text, `${name}: message alterada`);

    const json = JSON.stringify(row);
    const parsed = JSON.parse(json);
    assertEquals(parsed.message, text, `${name}: JSON round-trip perdeu bytes`);

    const bytes = new TextEncoder().encode(json);
    assert(bytes.length > 0);
    assert(!json.includes("\uFFFD"), `${name}: JSON contém U+FFFD`);
  }
});

Deno.test("buildTelemetryRow: payload gigante multibyte é truncado sem quebrar surrogate pair", () => {
  // 45k caracteres CJK (3 bytes UTF-8 cada) → ~135KB em UTF-8, > MAX_MESSAGE_LENGTH
  const cjk = "日本語テスト".repeat(7500);
  assert(cjk.length > MAX_MESSAGE_LENGTH);

  const row = buildTelemetryRow({
    raw: { message: cjk },
    fallbackRequestId: REQUEST_ID,
    userId: USER_ID,
  });
  assert(row !== null);
  assertEquals(row.message.length, MAX_MESSAGE_LENGTH);
  // Nenhum U+FFFD introduzido
  const encoded = new TextEncoder().encode(row.message);
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(encoded);
  assertEquals(decoded, row.message);

  // Payload com muitos emojis (surrogate pairs) — truncamento perto do limite
  // deve recuar 1 code unit se cair no meio de um par.
  const emojiHeavy = "🚀".repeat(MAX_MESSAGE_LENGTH); // 2 code units cada
  const row2 = buildTelemetryRow({
    raw: { message: emojiHeavy },
    fallbackRequestId: REQUEST_ID,
    userId: USER_ID,
  });
  assert(row2 !== null);
  assert(row2.message.length <= MAX_MESSAGE_LENGTH);
  // Deve ser par (cada 🚀 = 2 code units), sem lone surrogate final
  const lastCode = row2.message.charCodeAt(row2.message.length - 1);
  assert(!(lastCode >= 0xd800 && lastCode <= 0xdbff), "lone high surrogate no final");
  assertEquals(row2.message.length % 2, 0, "quebrou surrogate pair (length ímpar)");
  const bytes = new TextEncoder().encode(row2.message);
  assertEquals(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    row2.message,
    "encoding UTF-8 não é reversível — surrogate quebrado",
  );
});

Deno.test("property: buildTelemetryRow mantém message idempotente sob JSON round-trip para inputs multibyte", () => {
  const { rand, pick, seed } = createFuzzRng("multibyte-truncation");
  const codepoints = [
    "a", "Z", "1", " ", "\n", "\t",
    "á", "ñ", "ç",              // 2-byte
    "日", "中", "한", "ם",       // 3-byte
    "🚀", "🔥", "🧪", "👩‍💻",   // 4-byte + ZWJ
    "\u0301", "\u0300",         // combining
  ];

  for (let i = 0; i < 150; i++) {
    // Tamanho oscila em torno do limite para exercitar truncagem
    const target = MAX_MESSAGE_LENGTH - 32 + Math.floor(rand() * 128);
    let s = "";
    while (s.length < target) s += pick(codepoints);

    const row = buildTelemetryRow({
      raw: { message: s },
      fallbackRequestId: REQUEST_ID,
      userId: USER_ID,
    });
    assert(row !== null, `seed=${seed} iter=${i}`);
    assert(
      row.message.length <= MAX_MESSAGE_LENGTH,
      `seed=${seed} iter=${i} excedeu cap`,
    );

    // JSON round-trip idempotente
    const rt = JSON.parse(JSON.stringify(row.message));
    assertEquals(rt, row.message, `seed=${seed} iter=${i} JSON divergente`);

    // Encoding UTF-8 estrito (fatal) precisa aceitar — prova ausência de lone surrogate
    const bytes = new TextEncoder().encode(row.message);
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    assertEquals(
      decoded,
      row.message,
      `seed=${seed} iter=${i} encoding UTF-8 não reversível`,
    );
  }
});
