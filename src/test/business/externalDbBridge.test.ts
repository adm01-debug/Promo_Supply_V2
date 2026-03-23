import { describe, it, expect } from "vitest";

// ============================================================================
// Tests for external-db-bridge Edge Function logic
// Covers: emitTelemetry, classifyStatus, request validation, telemetry persistence
// ============================================================================

const SLOW_QUERY_THRESHOLD_MS = 3000;
const VERY_SLOW_QUERY_THRESHOLD_MS = 8000;

// ── Pure function replicas from Edge Function ──────────────────────────────

function classifyStatus(
  durationMs: number,
  hasError: boolean
): "ok" | "error" | "slow" | "very_slow" {
  if (hasError) return "error";
  if (durationMs >= VERY_SLOW_QUERY_THRESHOLD_MS) return "very_slow";
  if (durationMs >= SLOW_QUERY_THRESHOLD_MS) return "slow";
  return "ok";
}

interface TelemetryMeta {
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
}

function buildLogLine(meta: TelemetryMeta): string {
  const icon =
    meta.status === "very_slow" ? "🔴"
    : meta.status === "slow" ? "🟡"
    : meta.status === "error" ? "❌"
    : "✅";
  const target = meta.rpcName || meta.table || "unknown";
  return (
    `${icon} [telemetry] ${meta.operation}:${target} ${meta.durationMs}ms` +
    ` | records=${meta.recordCount ?? "-"}` +
    ` limit=${meta.limit ?? "-"}` +
    ` offset=${meta.offset ?? "-"}` +
    ` count=${meta.countMode ?? "-"}`
  );
}

function shouldPersist(status: string): boolean {
  return status !== "ok";
}

function buildTelemetryInsert(meta: TelemetryMeta) {
  return {
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
  };
}

const VALID_OPERATIONS = ["select", "insert", "update", "delete", "rpc"];

function validateOperation(op: string): boolean {
  return VALID_OPERATIONS.includes(op);
}

function validateSelectRequest(req: { table?: string; selectColumns?: string; limit?: number; offset?: number }) {
  const errors: string[] = [];
  if (!req.table) errors.push("table is required for select");
  if (req.limit !== undefined && (req.limit < 0 || req.limit > 10000)) errors.push("limit must be 0-10000");
  if (req.offset !== undefined && req.offset < 0) errors.push("offset must be >= 0");
  return errors;
}

// ============================================================================
// 1. classifyStatus — Status Classification
// ============================================================================

describe("classifyStatus", () => {
  it("returns 'ok' for fast queries without errors", () => {
    expect(classifyStatus(100, false)).toBe("ok");
    expect(classifyStatus(0, false)).toBe("ok");
    expect(classifyStatus(2999, false)).toBe("ok");
  });

  it("returns 'slow' for queries between 3s and 8s", () => {
    expect(classifyStatus(3000, false)).toBe("slow");
    expect(classifyStatus(5000, false)).toBe("slow");
    expect(classifyStatus(7999, false)).toBe("slow");
  });

  it("returns 'very_slow' for queries >= 8s", () => {
    expect(classifyStatus(8000, false)).toBe("very_slow");
    expect(classifyStatus(15000, false)).toBe("very_slow");
    expect(classifyStatus(60000, false)).toBe("very_slow");
  });

  it("returns 'error' regardless of duration when hasError is true", () => {
    expect(classifyStatus(0, true)).toBe("error");
    expect(classifyStatus(100, true)).toBe("error");
    expect(classifyStatus(5000, true)).toBe("error");
    expect(classifyStatus(10000, true)).toBe("error");
  });

  it("prioritizes error over slow/very_slow", () => {
    expect(classifyStatus(VERY_SLOW_QUERY_THRESHOLD_MS, true)).toBe("error");
    expect(classifyStatus(SLOW_QUERY_THRESHOLD_MS, true)).toBe("error");
  });

  it("handles exact boundary values", () => {
    expect(classifyStatus(SLOW_QUERY_THRESHOLD_MS - 1, false)).toBe("ok");
    expect(classifyStatus(SLOW_QUERY_THRESHOLD_MS, false)).toBe("slow");
    expect(classifyStatus(VERY_SLOW_QUERY_THRESHOLD_MS - 1, false)).toBe("slow");
    expect(classifyStatus(VERY_SLOW_QUERY_THRESHOLD_MS, false)).toBe("very_slow");
  });

  it("handles negative durations gracefully", () => {
    expect(classifyStatus(-1, false)).toBe("ok");
    expect(classifyStatus(-1000, false)).toBe("ok");
  });
});

// ============================================================================
// 2. buildLogLine — Log Line Generation
// ============================================================================

describe("buildLogLine", () => {
  it("generates correct log for ok queries", () => {
    const line = buildLogLine({
      operation: "select", table: "products", durationMs: 150,
      status: "ok", recordCount: 42, limit: 100, offset: 0, countMode: "exact",
    });
    expect(line).toContain("✅");
    expect(line).toContain("select:products");
    expect(line).toContain("150ms");
    expect(line).toContain("records=42");
    expect(line).toContain("limit=100");
    expect(line).toContain("offset=0");
    expect(line).toContain("count=exact");
  });

  it("generates correct log for slow queries", () => {
    const line = buildLogLine({
      operation: "select", table: "orders", durationMs: 4500,
      status: "slow", recordCount: 1000, limit: 1000, offset: 0,
    });
    expect(line).toContain("🟡");
    expect(line).toContain("select:orders");
    expect(line).toContain("4500ms");
  });

  it("generates correct log for very_slow queries", () => {
    const line = buildLogLine({
      operation: "select", table: "audit_logs", durationMs: 12000,
      status: "very_slow",
    });
    expect(line).toContain("🔴");
    expect(line).toContain("12000ms");
  });

  it("generates correct log for error queries", () => {
    const line = buildLogLine({
      operation: "insert", table: "users", durationMs: 50,
      status: "error", error: "Unique constraint violated",
    });
    expect(line).toContain("❌");
    expect(line).toContain("insert:users");
  });

  it("uses rpcName when table is not set", () => {
    const line = buildLogLine({
      operation: "rpc", rpcName: "calculate_totals", durationMs: 200,
      status: "ok",
    });
    expect(line).toContain("rpc:calculate_totals");
  });

  it("uses 'unknown' when neither table nor rpcName is set", () => {
    const line = buildLogLine({
      operation: "select", durationMs: 100, status: "ok",
    });
    expect(line).toContain("select:unknown");
  });

  it("handles missing optional fields with dashes", () => {
    const line = buildLogLine({
      operation: "select", table: "t", durationMs: 100, status: "ok",
    });
    expect(line).toContain("records=-");
    expect(line).toContain("limit=-");
    expect(line).toContain("offset=-");
    expect(line).toContain("count=-");
  });

  it("prefers rpcName over table when both exist", () => {
    const line = buildLogLine({
      operation: "rpc", table: "some_table", rpcName: "my_func",
      durationMs: 100, status: "ok",
    });
    expect(line).toContain("rpc:my_func");
    expect(line).not.toContain("some_table");
  });
});

// ============================================================================
// 3. shouldPersist — Persistence Decision
// ============================================================================

describe("shouldPersist", () => {
  it("does NOT persist 'ok' status", () => {
    expect(shouldPersist("ok")).toBe(false);
  });

  it("persists 'slow' status", () => {
    expect(shouldPersist("slow")).toBe(true);
  });

  it("persists 'very_slow' status", () => {
    expect(shouldPersist("very_slow")).toBe(true);
  });

  it("persists 'error' status", () => {
    expect(shouldPersist("error")).toBe(true);
  });

  it("persists unknown statuses (defensive)", () => {
    expect(shouldPersist("critical")).toBe(true);
    expect(shouldPersist("")).toBe(true);
  });
});

// ============================================================================
// 4. buildTelemetryInsert — Insert Payload Construction
// ============================================================================

describe("buildTelemetryInsert", () => {
  it("builds correct insert for a slow select", () => {
    const result = buildTelemetryInsert({
      operation: "select", table: "products", durationMs: 4500,
      status: "slow", recordCount: 250, limit: 500, offset: 0,
      countMode: "exact", userId: "user-123",
    });
    expect(result).toEqual({
      operation: "select",
      table_name: "products",
      rpc_name: null,
      duration_ms: 4500,
      record_count: 250,
      query_limit: 500,
      query_offset: 0,
      count_mode: "exact",
      severity: "slow",
      error_message: null,
      user_id: "user-123",
    });
  });

  it("builds correct insert for an error", () => {
    const result = buildTelemetryInsert({
      operation: "insert", table: "orders", durationMs: 100,
      status: "error", error: "FK constraint violation",
    });
    expect(result.severity).toBe("error");
    expect(result.error_message).toBe("FK constraint violation");
    expect(result.record_count).toBeNull();
    expect(result.user_id).toBeNull();
  });

  it("builds correct insert for RPC", () => {
    const result = buildTelemetryInsert({
      operation: "rpc", rpcName: "calculate_score", durationMs: 9000,
      status: "very_slow",
    });
    expect(result.rpc_name).toBe("calculate_score");
    expect(result.table_name).toBeNull();
    expect(result.severity).toBe("very_slow");
  });

  it("handles all null/undefined optional fields", () => {
    const result = buildTelemetryInsert({
      operation: "select", durationMs: 5000, status: "slow",
    });
    expect(result.table_name).toBeNull();
    expect(result.rpc_name).toBeNull();
    expect(result.record_count).toBeNull();
    expect(result.query_limit).toBeNull();
    expect(result.query_offset).toBeNull();
    expect(result.count_mode).toBeNull();
    expect(result.error_message).toBeNull();
    expect(result.user_id).toBeNull();
  });

  it("maps userId null correctly", () => {
    const r1 = buildTelemetryInsert({ operation: "select", durationMs: 100, status: "slow", userId: null });
    expect(r1.user_id).toBeNull();

    const r2 = buildTelemetryInsert({ operation: "select", durationMs: 100, status: "slow", userId: undefined });
    expect(r2.user_id).toBeNull();
  });

  it("preserves exact duration_ms value", () => {
    const result = buildTelemetryInsert({ operation: "select", durationMs: 12345, status: "very_slow" });
    expect(result.duration_ms).toBe(12345);
  });
});

// ============================================================================
// 5. validateOperation — Request Validation
// ============================================================================

describe("validateOperation", () => {
  it("accepts all valid operations", () => {
    for (const op of VALID_OPERATIONS) {
      expect(validateOperation(op)).toBe(true);
    }
  });

  it("rejects invalid operations", () => {
    expect(validateOperation("drop")).toBe(false);
    expect(validateOperation("truncate")).toBe(false);
    expect(validateOperation("ALTER")).toBe(false);
    expect(validateOperation("SELECT")).toBe(false); // case sensitive
    expect(validateOperation("")).toBe(false);
  });
});

describe("validateSelectRequest", () => {
  it("passes valid request", () => {
    expect(validateSelectRequest({ table: "products", limit: 100, offset: 0 })).toEqual([]);
  });

  it("fails when table is missing", () => {
    const errors = validateSelectRequest({ limit: 100 });
    expect(errors).toContain("table is required for select");
  });

  it("fails when limit is out of range", () => {
    expect(validateSelectRequest({ table: "t", limit: -1 })).toContain("limit must be 0-10000");
    expect(validateSelectRequest({ table: "t", limit: 10001 })).toContain("limit must be 0-10000");
  });

  it("fails when offset is negative", () => {
    expect(validateSelectRequest({ table: "t", offset: -1 })).toContain("offset must be >= 0");
  });

  it("allows missing limit and offset (defaults)", () => {
    expect(validateSelectRequest({ table: "t" })).toEqual([]);
  });
});

// ============================================================================
// 6. End-to-End Flow Simulation
// ============================================================================

describe("E2E Flow Simulation", () => {
  function simulateQuery(durationMs: number, hasError: boolean, table: string, limit = 100, offset = 0) {
    const status = classifyStatus(durationMs, hasError);
    const meta: TelemetryMeta = {
      operation: "select", table, durationMs, status,
      recordCount: hasError ? undefined : 42,
      limit, offset, countMode: "exact",
      error: hasError ? "Some error" : undefined,
      userId: "user-abc",
    };
    const logLine = buildLogLine(meta);
    const persist = shouldPersist(status);
    const insert = persist ? buildTelemetryInsert(meta) : null;
    return { status, logLine, persist, insert };
  }

  it("fast query: no persistence, ok status", () => {
    const r = simulateQuery(150, false, "products");
    expect(r.status).toBe("ok");
    expect(r.persist).toBe(false);
    expect(r.insert).toBeNull();
    expect(r.logLine).toContain("✅");
  });

  it("slow query: persists with severity=slow", () => {
    const r = simulateQuery(4500, false, "orders");
    expect(r.status).toBe("slow");
    expect(r.persist).toBe(true);
    expect(r.insert!.severity).toBe("slow");
    expect(r.insert!.table_name).toBe("orders");
    expect(r.logLine).toContain("🟡");
  });

  it("very slow query: persists with severity=very_slow", () => {
    const r = simulateQuery(12000, false, "audit_logs");
    expect(r.status).toBe("very_slow");
    expect(r.persist).toBe(true);
    expect(r.insert!.severity).toBe("very_slow");
    expect(r.logLine).toContain("🔴");
  });

  it("error query: persists with severity=error", () => {
    const r = simulateQuery(50, true, "users");
    expect(r.status).toBe("error");
    expect(r.persist).toBe(true);
    expect(r.insert!.severity).toBe("error");
    expect(r.insert!.error_message).toBe("Some error");
    expect(r.logLine).toContain("❌");
  });

  it("preserves limit and offset in insert", () => {
    const r = simulateQuery(5000, false, "items", 250, 500);
    expect(r.insert!.query_limit).toBe(250);
    expect(r.insert!.query_offset).toBe(500);
  });

  it("preserves user_id in insert", () => {
    const r = simulateQuery(4000, false, "t");
    expect(r.insert!.user_id).toBe("user-abc");
  });
});

// ============================================================================
// 7. Threshold Constants
// ============================================================================

describe("Threshold Constants", () => {
  it("slow threshold is 3000ms", () => {
    expect(SLOW_QUERY_THRESHOLD_MS).toBe(3000);
  });

  it("very slow threshold is 8000ms", () => {
    expect(VERY_SLOW_QUERY_THRESHOLD_MS).toBe(8000);
  });

  it("slow < very_slow", () => {
    expect(SLOW_QUERY_THRESHOLD_MS).toBeLessThan(VERY_SLOW_QUERY_THRESHOLD_MS);
  });
});

// ============================================================================
// 8. CORS Headers
// ============================================================================

describe("CORS Headers", () => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };

  it("allows all origins", () => {
    expect(corsHeaders["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("includes authorization header", () => {
    expect(corsHeaders["Access-Control-Allow-Headers"]).toContain("authorization");
  });

  it("includes content-type header", () => {
    expect(corsHeaders["Access-Control-Allow-Headers"]).toContain("content-type");
  });

  it("includes apikey header", () => {
    expect(corsHeaders["Access-Control-Allow-Headers"]).toContain("apikey");
  });

  it("includes supabase client headers", () => {
    expect(corsHeaders["Access-Control-Allow-Headers"]).toContain("x-supabase-client-platform");
  });
});

// ============================================================================
// 9. Insert Payload Integrity (stress/edge cases)
// ============================================================================

describe("Insert Payload Integrity", () => {
  it("handles very long table names", () => {
    const longName = "a".repeat(500);
    const r = buildTelemetryInsert({ operation: "select", table: longName, durationMs: 5000, status: "slow" });
    expect(r.table_name).toBe(longName);
  });

  it("handles special characters in error messages", () => {
    const msg = 'Error: column "name" contains NULL\n\tat line 42';
    const r = buildTelemetryInsert({ operation: "insert", durationMs: 100, status: "error", error: msg });
    expect(r.error_message).toBe(msg);
  });

  it("handles zero duration", () => {
    const r = buildTelemetryInsert({ operation: "select", durationMs: 0, status: "ok" });
    expect(r.duration_ms).toBe(0);
  });

  it("handles very large duration", () => {
    const r = buildTelemetryInsert({ operation: "select", durationMs: 999999, status: "very_slow" });
    expect(r.duration_ms).toBe(999999);
  });

  it("handles zero record count", () => {
    const r = buildTelemetryInsert({ operation: "select", durationMs: 5000, status: "slow", recordCount: 0 });
    expect(r.record_count).toBe(0);
  });

  it("handles very large record count", () => {
    const r = buildTelemetryInsert({ operation: "select", durationMs: 5000, status: "slow", recordCount: 1000000 });
    expect(r.record_count).toBe(1000000);
  });

  it("handles empty string countMode as null", () => {
    const r = buildTelemetryInsert({ operation: "select", durationMs: 5000, status: "slow", countMode: "" });
    expect(r.count_mode).toBeNull();
  });

  it("handles empty string error as null", () => {
    const r = buildTelemetryInsert({ operation: "select", durationMs: 5000, status: "slow", error: "" });
    expect(r.error_message).toBeNull();
  });
});

// ============================================================================
// 10. Batch/Volume Tests
// ============================================================================

describe("Batch Volume Tests", () => {
  it("classifies 1000 queries correctly", () => {
    const results = Array.from({ length: 1000 }, (_, i) => {
      const duration = i * 10; // 0ms to 9990ms
      const hasError = i % 100 === 0; // 1% errors
      return classifyStatus(duration, hasError);
    });

    const ok = results.filter(r => r === "ok").length;
    const slow = results.filter(r => r === "slow").length;
    const verySlow = results.filter(r => r === "very_slow").length;
    const errors = results.filter(r => r === "error").length;

    expect(ok + slow + verySlow + errors).toBe(1000);
    expect(ok).toBeGreaterThan(0);
    expect(slow).toBeGreaterThan(0);
    expect(verySlow).toBeGreaterThan(0);
    expect(errors).toBe(10); // 0, 100, 200, ..., 900
  });

  it("builds 500 insert payloads without error", () => {
    const payloads = Array.from({ length: 500 }, (_, i) => {
      return buildTelemetryInsert({
        operation: i % 5 === 0 ? "rpc" : "select",
        table: i % 5 === 0 ? undefined : `table_${i}`,
        rpcName: i % 5 === 0 ? `func_${i}` : undefined,
        durationMs: 3000 + i * 10,
        status: classifyStatus(3000 + i * 10, false),
        recordCount: i,
        limit: 100,
        offset: i * 100,
        countMode: "exact",
        userId: `user-${i}`,
      });
    });

    expect(payloads).toHaveLength(500);
    payloads.forEach((p, i) => {
      expect(p.duration_ms).toBe(3000 + i * 10);
      expect(p.operation).toBeDefined();
      expect(["slow", "very_slow"]).toContain(p.severity);
    });
  });

  it("generates 200 log lines without throwing", () => {
    const lines = Array.from({ length: 200 }, (_, i) => {
      return buildLogLine({
        operation: "select",
        table: `table_${i}`,
        durationMs: i * 50,
        status: classifyStatus(i * 50, false),
      });
    });
    expect(lines).toHaveLength(200);
    lines.forEach(l => {
      expect(typeof l).toBe("string");
      expect(l.length).toBeGreaterThan(10);
    });
  });
});

// ============================================================================
// 11. Filter Operations (simulating edge function filter logic)
// ============================================================================

describe("Filter Operations", () => {
  type FilterOp = { operator: string; value: unknown };

  function applyFilter(data: Record<string, unknown>[], key: string, filter: FilterOp) {
    return data.filter(row => {
      const val = row[key];
      switch (filter.operator) {
        case "eq": return val === filter.value;
        case "neq": return val !== filter.value;
        case "gt": return (val as number) > (filter.value as number);
        case "gte": return (val as number) >= (filter.value as number);
        case "lt": return (val as number) < (filter.value as number);
        case "lte": return (val as number) <= (filter.value as number);
        case "in": return (filter.value as unknown[]).includes(val);
        default: return true;
      }
    });
  }

  const sampleData = [
    { id: 1, status: "active", value: 100 },
    { id: 2, status: "inactive", value: 200 },
    { id: 3, status: "active", value: 300 },
    { id: 4, status: "blocked", value: 50 },
  ];

  it("filters by eq", () => {
    const r = applyFilter(sampleData, "status", { operator: "eq", value: "active" });
    expect(r).toHaveLength(2);
  });

  it("filters by neq", () => {
    const r = applyFilter(sampleData, "status", { operator: "neq", value: "active" });
    expect(r).toHaveLength(2);
  });

  it("filters by gt", () => {
    const r = applyFilter(sampleData, "value", { operator: "gt", value: 100 });
    expect(r).toHaveLength(2);
  });

  it("filters by gte", () => {
    const r = applyFilter(sampleData, "value", { operator: "gte", value: 100 });
    expect(r).toHaveLength(3);
  });

  it("filters by lt", () => {
    const r = applyFilter(sampleData, "value", { operator: "lt", value: 200 });
    expect(r).toHaveLength(2);
  });

  it("filters by lte", () => {
    const r = applyFilter(sampleData, "value", { operator: "lte", value: 200 });
    expect(r).toHaveLength(3);
  });

  it("filters by in", () => {
    const r = applyFilter(sampleData, "status", { operator: "in", value: ["active", "blocked"] });
    expect(r).toHaveLength(3);
  });
});

// ============================================================================
// 12. Response Format
// ============================================================================

describe("Response Format", () => {
  function buildSuccessResponse(data: unknown[], count: number | null, durationMs: number, status: string, recordCount?: number) {
    return {
      data,
      count: count ?? null,
      meta: { durationMs, status, recordCount },
    };
  }

  function buildErrorResponse(message: string) {
    return { error: message };
  }

  it("success response has correct shape", () => {
    const r = buildSuccessResponse([{ id: 1 }], 1, 150, "ok", 1);
    expect(r).toHaveProperty("data");
    expect(r).toHaveProperty("count");
    expect(r).toHaveProperty("meta");
    expect(r.meta).toHaveProperty("durationMs");
    expect(r.meta).toHaveProperty("status");
    expect(r.meta).toHaveProperty("recordCount");
  });

  it("error response has correct shape", () => {
    const r = buildErrorResponse("Table not found");
    expect(r).toHaveProperty("error");
    expect(r.error).toBe("Table not found");
  });

  it("count is null when not available", () => {
    const r = buildSuccessResponse([], null, 50, "ok", 0);
    expect(r.count).toBeNull();
  });

  it("meta includes telemetry data", () => {
    const r = buildSuccessResponse([], 0, 4500, "slow", 0);
    expect(r.meta.durationMs).toBe(4500);
    expect(r.meta.status).toBe("slow");
  });
});
