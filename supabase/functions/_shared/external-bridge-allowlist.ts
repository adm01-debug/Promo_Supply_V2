/**
 * Allowlist de tabelas e RPCs autorizadas para o `external-db-bridge`.
 *
 * Regra de ouro (A-01 · AUDITORIA_BACKEND_V2): a bridge só executa contra
 * objetos declarados aqui. Qualquer requisição fora dessa lista é rejeitada
 * com 403 ANTES de tocar no banco externo — sem esta camada um usuário
 * autenticado poderia enumerar/mutar qualquer tabela do DB externo.
 *
 * Para adicionar um novo alvo:
 *   1. Registrar aqui com comentário explicando o caso de uso;
 *   2. Abrir PR com revisão de segurança;
 *   3. Refletir na doc `DeveloperDocs.tsx` (seção "Contratos").
 */

/** Tabelas do DB externo que podem ser lidas/escritas pelo frontend. */
export const ALLOWED_TABLES = new Set<string>([
  // catálogo público (leitura)
  "produtos_externos",
  "fornecedores_externos",
  "spot_pedidos_view",
]);

/** Funções (RPC) do DB externo que podem ser invocadas. */
export const ALLOWED_RPCS = new Set<string>([
  "get_saldo_credito",
  "buscar_produto_por_sku",
]);

/** Operações válidas — qualquer valor fora disso é rejeitado. */
export const ALLOWED_OPERATIONS = [
  "select",
  "insert",
  "update",
  "delete",
  "rpc",
] as const;
export type BridgeOperation = (typeof ALLOWED_OPERATIONS)[number];

/** Operadores de filtro válidos (evita `is`, `not.*`, `fts` etc. arbitrários). */
export const ALLOWED_FILTER_OPERATORS = new Set<string>([
  "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in",
]);

/** Modos de contagem aceitos. */
export const ALLOWED_COUNT_MODES = new Set<string>(["none", "exact", "planned"]);

/** Limite máximo por chamada — evita dump silencioso. */
export const MAX_SELECT_LIMIT = 500;

/** Resultado da validação; se `ok=false`, `reason` explica o motivo. */
export type BridgeAuthzResult =
  | { ok: true }
  | { ok: false; status: number; reason: string };

export function assertBridgeRequest(input: {
  operation: string;
  table?: string;
  rpcName?: string;
  countMode?: string;
  filters?: Record<string, unknown>;
  limit?: number;
}): BridgeAuthzResult {
  if (!ALLOWED_OPERATIONS.includes(input.operation as BridgeOperation)) {
    return { ok: false, status: 400, reason: `operation "${input.operation}" not allowed` };
  }

  if (input.operation === "rpc") {
    if (!input.rpcName) return { ok: false, status: 400, reason: "rpcName is required for rpc operation" };
    if (!ALLOWED_RPCS.has(input.rpcName)) {
      return { ok: false, status: 403, reason: `rpc "${input.rpcName}" is not in allowlist` };
    }
  } else {
    if (!input.table) return { ok: false, status: 400, reason: "table is required" };
    if (!ALLOWED_TABLES.has(input.table)) {
      return { ok: false, status: 403, reason: `table "${input.table}" is not in allowlist` };
    }
  }

  if (input.countMode && !ALLOWED_COUNT_MODES.has(input.countMode)) {
    return { ok: false, status: 400, reason: `countMode "${input.countMode}" not allowed` };
  }

  if (typeof input.limit === "number" && input.limit > MAX_SELECT_LIMIT) {
    return { ok: false, status: 400, reason: `limit exceeds ${MAX_SELECT_LIMIT}` };
  }

  if (input.filters) {
    for (const [key, raw] of Object.entries(input.filters)) {
      if (raw && typeof raw === "object") {
        const op = (raw as { operator?: string }).operator;
        if (op && !ALLOWED_FILTER_OPERATORS.has(op)) {
          return { ok: false, status: 400, reason: `filter operator "${op}" on "${key}" not allowed` };
        }
      }
    }
  }

  return { ok: true };
}
