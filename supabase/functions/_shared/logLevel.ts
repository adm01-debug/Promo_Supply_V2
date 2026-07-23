/**
 * Helpers puros e testáveis para normalização de nível de log e
 * construção do payload persistido em `telemetry_logs`.
 *
 * Extraídos de `telemetry/index.ts` para permitir property tests
 * sem levantar o runtime HTTP do Deno.
 */

export type CanonicalLogLevel = "info" | "warn" | "error" | "debug";

export const CANONICAL_LEVELS: readonly CanonicalLogLevel[] = [
  "info",
  "warn",
  "error",
  "debug",
];

export const DEFAULT_LEVEL: CanonicalLogLevel = "info";

/**
 * Mapeia qualquer valor de nível recebido de clientes (inclusive
 * inválidos, `null`, objetos, símbolos) para um dos níveis canônicos.
 *
 * Regras:
 *  - `null`/`undefined`/vazio → `DEFAULT_LEVEL` ("info")
 *  - `"warning"` (case-insensitive, com whitespace) → `"warn"`
 *  - qualquer variação case/whitespace de um nível canônico é aceita
 *  - qualquer outra entrada → `DEFAULT_LEVEL`
 */
export function normalizeLevel(input: unknown): CanonicalLogLevel {
  if (typeof input !== "string") return DEFAULT_LEVEL;
  const s = input.toLowerCase().trim();
  if (s === "") return DEFAULT_LEVEL;
  if (s === "warning") return "warn";
  return (CANONICAL_LEVELS as readonly string[]).includes(s)
    ? (s as CanonicalLogLevel)
    : DEFAULT_LEVEL;
}

export const MAX_MESSAGE_LENGTH = 4000;

/**
 * Trunca uma string em no máximo `maxUnits` UTF-16 code units SEM quebrar
 * um surrogate pair (evita gerar lone surrogates que viram U+FFFD ao
 * serem codificados em UTF-8 pelo `TextEncoder`).
 *
 * Garantias:
 *  - `result.length <= maxUnits`
 *  - `JSON.stringify(result)` é sempre válido e reversível
 *  - `new TextEncoder().encode(result)` nunca insere U+FFFD para input válido
 */
export function safeTruncate(input: string, maxUnits: number): string {
  if (input.length <= maxUnits) return input;
  let end = maxUnits;
  // Se cortamos exatamente entre um high e low surrogate, recua 1 code unit.
  const code = input.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return input.slice(0, end);
}

export interface TelemetryRowInput {
  raw: Record<string, unknown>;
  fallbackRequestId: string;
  userId: string | null;
  fallbackTenantId?: string | null;
  clientIp?: string | null;
}

export interface TelemetryRow {
  level: CanonicalLogLevel;
  message: string;
  context: Record<string, unknown> | null;
  request_id: string;
  user_id: string | null;
  tenant_id: string | null;
  url: string | null;
  user_agent: string | null;
  client_ip: string | null;
}

/**
 * Constrói a linha final gravada em `telemetry_logs` a partir de um
 * item bruto enviado pelo cliente. Retorna `null` quando a entrada é
 * inválida (sem mensagem string não-vazia) — o chamador deve filtrar.
 */
export function buildTelemetryRow(
  input: TelemetryRowInput,
): TelemetryRow | null {
  const e = input.raw;
  if (!e || typeof e !== "object") return null;
  const msg = (e as { message?: unknown }).message;
  if (typeof msg !== "string" || msg.length === 0) return null;

  const context = (e as { context?: unknown }).context;
  const requestId = (e as { requestId?: unknown }).requestId;
  const tenantId = (e as { tenantId?: unknown }).tenantId;
  const url = (e as { url?: unknown }).url;
  const userAgent = (e as { userAgent?: unknown }).userAgent;

  return {
    level: normalizeLevel((e as { level?: unknown }).level),
    message: msg.slice(0, MAX_MESSAGE_LENGTH),
    context:
      context && typeof context === "object" && !Array.isArray(context)
        ? (context as Record<string, unknown>)
        : null,
    request_id: typeof requestId === "string" && requestId.length > 0
      ? requestId
      : input.fallbackRequestId,
    user_id: input.userId,
    tenant_id: typeof tenantId === "string" && tenantId.length > 0
      ? tenantId
      : input.fallbackTenantId ?? null,
    url: typeof url === "string" ? url : null,
    user_agent: typeof userAgent === "string" ? userAgent : null,
    client_ip: input.clientIp ?? null,
  };
}
