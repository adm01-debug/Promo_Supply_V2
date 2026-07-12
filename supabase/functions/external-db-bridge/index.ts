import { corsHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";
import { assertBridgeRequest, MAX_SELECT_LIMIT } from "../_shared/external-bridge-allowlist.ts";


const SLOW_QUERY_THRESHOLD_MS = 3000;
const VERY_SLOW_QUERY_THRESHOLD_MS = 8000;

function emitTelemetry(logger: EdgeLogger, meta: {
  operation: string;
  table?: string;
  rpcName?: string;
  limit?: number;
  offset?: number;
  countMode?: string;
  durationMs: number;
  recordCount?: number;
  status: "ok" | "error" | "slow" | "very_slow";
  error?: string;
  userId?: string | null;
}) {
  const icon =
    meta.status === "very_slow" ? "🔴"
    : meta.status === "slow" ? "🟡"
    : meta.status === "error" ? "❌"
    : "✅";

  const target = meta.rpcName || meta.table || "unknown";
  const line =
    `${icon} [telemetry] ${meta.operation}:${target} ${meta.durationMs}ms` +
    ` | records=${meta.recordCount ?? "-"}` +
    ` limit=${meta.limit ?? "-"}` +
    ` offset=${meta.offset ?? "-"}` +
    ` count=${meta.countMode ?? "-"}`;

  if (meta.status === "very_slow") {
    logger.warn(`VERY SLOW QUERY: ${line}`);
  } else if (meta.status === "slow") {
    logger.warn(`SLOW QUERY: ${line}`);
  } else if (meta.status === "error") {
    logger.error(line + ` error=${meta.error}`);
  } else {
    logger.info(line);
  }

  // Fire-and-forget persistence (only for non-ok)
  if (meta.status !== "ok") {
    try {
      const localUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (localUrl && serviceKey) {
        const localClient = createClient(localUrl, serviceKey);
        localClient
          .from("query_telemetry")
          .insert({
            operation: meta.operation,
            table_name: meta.table || null,
            rpc_name: meta.rpcName || null,
            duration_ms: meta.durationMs,
            record_count: meta.recordCount ?? null,
            query_limit: meta.limit ?? null,
            query_offset: meta.offset ?? null,
            count_mode: meta.countMode || null,
            severity: meta.status,
            error_message: meta.error || null,
            user_id: meta.userId || null,
          })
          .then(({ error: insertErr }) => {
            if (insertErr)
              logger.warn("[telemetry-persist] Insert failed", { error: insertErr.message });
          });
      }
    } catch (_e) {
      // Fire-and-forget: NEVER block the main response
    }
  }
}

function classifyStatus(
  durationMs: number,
  hasError: boolean
): "ok" | "error" | "slow" | "very_slow" {
  if (hasError) return "error";
  if (durationMs >= VERY_SLOW_QUERY_THRESHOLD_MS) return "very_slow";
  if (durationMs >= SLOW_QUERY_THRESHOLD_MS) return "slow";
  return "ok";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger('external-db-bridge', requestId);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const localUrl = Deno.env.get("SUPABASE_URL")!;
    const localKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const localClient = createClient(localUrl, localKey);
    const { data: { user }, error: authError } = await localClient.auth.getUser(
      authHeader.slice("Bearer ".length)
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      operation = "select",
      table,
      rpcName,
      selectColumns = "*",
      limit: rawLimit = 100,
      offset = 0,
      countMode = "none",
      filters = {},
      params = {},
      data: bodyData,
    } = await req.json();

    // Clamp de limit para evitar dump silencioso do DB externo.
    const limit = Math.min(Math.max(1, Number(rawLimit) || 100), MAX_SELECT_LIMIT);

    // A-01 · Allowlist estrita (rejeita antes de tocar no DB externo).
    const authz = assertBridgeRequest({ operation, table, rpcName, countMode, filters, limit });
    if (!authz.ok) {
      logger.warn("bridge request rejected", { userId: user.id, operation, table, rpcName, reason: authz.reason });
      return new Response(
        JSON.stringify({ error: authz.reason }),
        { status: authz.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limit por usuário (60 req/min) — protege o DB externo de abuso.
    const rl = await checkRateLimit({
      identifier: `user:${user.id}`,
      endpoint: "external-db-bridge",
      maxRequests: 60,
      windowSeconds: 60,
    });
    if (!rl.allowed) {
      logger.warn("bridge rate limited", { userId: user.id, retryAfter: rl.retryAfterSeconds });
      return rateLimitedResponse(rl.retryAfterSeconds, corsHeaders);
    }

    // Get external DB credentials
    const externalUrl = Deno.env.get("EXTERNAL_DB_URL");
    const externalKey = Deno.env.get("EXTERNAL_DB_KEY");



    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({ error: "External database not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const externalClient = createClient(externalUrl, externalKey);

    let result: { data: unknown; error: unknown; count?: number | null } = {
      data: null,
      error: null,
    };

    const startTime = performance.now();

    switch (operation) {
      case "select": {
        let query = externalClient
          .from(table)
          .select(selectColumns, {
            count: countMode === "none" ? undefined : (countMode as "exact" | "planned"),
          });

        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
          if (typeof value === "object" && value !== null) {
            const filterObj = value as Record<string, unknown>;
            if (filterObj.operator && filterObj.value !== undefined) {
              switch (filterObj.operator) {
                case "eq": query = query.eq(key, filterObj.value); break;
                case "neq": query = query.neq(key, filterObj.value as string); break;
                case "gt": query = query.gt(key, filterObj.value as string); break;
                case "gte": query = query.gte(key, filterObj.value as string); break;
                case "lt": query = query.lt(key, filterObj.value as string); break;
                case "lte": query = query.lte(key, filterObj.value as string); break;
                case "like": query = query.like(key, filterObj.value as string); break;
                case "ilike": query = query.ilike(key, filterObj.value as string); break;
                case "in": query = query.in(key, filterObj.value as string[]); break;
              }
            }
          } else {
            query = query.eq(key, value);
          }
        }

        query = query.range(offset, offset + limit - 1);
        const res = await query;
        result = { data: res.data, error: res.error, count: res.count };
        break;
      }

      case "insert": {
        const res = await externalClient.from(table).insert(bodyData).select();
        result = { data: res.data, error: res.error };
        break;
      }

      case "update": {
        let query = externalClient.from(table).update(bodyData);
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(key, value);
        }
        const res = await query.select();
        result = { data: res.data, error: res.error };
        break;
      }

      case "delete": {
        let query = externalClient.from(table).delete();
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(key, value);
        }
        const res = await query.select();
        result = { data: res.data, error: res.error };
        break;
      }

      case "rpc": {
        const res = await externalClient.rpc(rpcName, params);
        result = { data: res.data, error: res.error };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unsupported operation: ${operation}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const durationMs = Math.round(performance.now() - startTime);
    const hasError = !!result.error;
    const status = classifyStatus(durationMs, hasError);
    const recordCount = Array.isArray(result.data) ? result.data.length : undefined;

    emitTelemetry(logger, {
      operation,
      table,
      rpcName,
      limit,
      offset,
      countMode,
      durationMs,
      status,
      recordCount,
      error: hasError ? (result.error as { message?: string })?.message : undefined,
      userId: user.id,
    });

    if (hasError) {
      return new Response(
        JSON.stringify({ error: (result.error as { message?: string })?.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        data: result.data,
        count: result.count ?? null,
        meta: { durationMs, status, recordCount },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (typeof logger !== 'undefined') {
      logger.error("Error in external-db-bridge", { error: err.message });
    } else {
      console.error("[external-db-bridge] Error:", err);
    }
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
