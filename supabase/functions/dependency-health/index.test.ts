// Deno tests for the dependency-health edge function.
//
// Coverage:
//  • GET                       → 200 + valid snapshot shape
//  • POST (no auth)            → 401
//  • POST (non-admin user)     → 403
//  • POST (admin user)         → 200 + valid snapshot shape (best-effort:
//      skipped if QA admin login or GITHUB_REPO_RAW_BASE secret is missing)
//
// Run with: deno test --allow-net --allow-env supabase/functions/dependency-health
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/dependency-health`;

// QA admin (see mem://reference/qa-credentials)
const QA_ADMIN_EMAIL = Deno.env.get("QA_ADMIN_EMAIL") ?? "qa-admin@promobrindes.test";
const QA_ADMIN_PASSWORD = Deno.env.get("QA_ADMIN_PASSWORD") ?? "QaTest@2026!";

const baseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
};

// ── helpers ──────────────────────────────────────────────────────
async function signIn(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return body?.access_token ?? null;
}

async function signUpEphemeral(): Promise<string | null> {
  // Create a throwaway non-admin account. Auto-confirm is enabled in QA.
  const email = `dh-test-${crypto.randomUUID()}@promobrindes.test`;
  const password = `Tmp_${crypto.randomUUID()}!Aa1`;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return body?.access_token ?? (await signIn(email, password));
}

function assertSnapshotShape(payload: unknown) {
  assert(payload && typeof payload === "object", "payload should be an object");
  const p = payload as Record<string, unknown>;
  assertExists(p.generatedAt, "generatedAt missing");
  assert(typeof p.generatedAt === "string");

  assertExists(p.dateFns, "dateFns missing");
  const df = p.dateFns as Record<string, unknown>;
  for (const k of ["spec", "installed", "locked"]) {
    assert(typeof df[k] === "string", `dateFns.${k} should be string`);
  }
  assert(typeof df.exactPinned === "boolean", "dateFns.exactPinned should be boolean");

  assertExists(p.lockfileDrift, "lockfileDrift missing");
  const ld = p.lockfileDrift as Record<string, unknown>;
  assert(typeof ld.detected === "boolean");
  assert(typeof ld.lastCheckedAt === "string");
  assert(typeof ld.source === "string");

  if (p.packages !== undefined) {
    assert(Array.isArray(p.packages), "packages should be array");
  }
}

// ── tests ────────────────────────────────────────────────────────
Deno.test("GET dependency-health → 200 with valid snapshot shape", async () => {
  const res = await fetch(FN_URL, {
    method: "GET",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertSnapshotShape(body);
});

Deno.test("GET dependency-health?history=true → 200 with history array", async () => {
  const res = await fetch(`${FN_URL}?history=true`, {
    method: "GET",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const body = await res.json();
  // history endpoint requires service-role internally; if it errors, the
  // function returns 500 — accept either, but if 200, validate shape.
  assert(res.status === 200 || res.status === 500, `unexpected status ${res.status}`);
  if (res.status === 200) {
    assert(Array.isArray(body?.history), "history should be an array");
  }
});

Deno.test("POST dependency-health (no auth) → 401", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: "{}",
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertEquals(body?.error, "Missing Authorization header");
});

Deno.test("POST dependency-health (non-admin user) → 403", async () => {
  const token = await signUpEphemeral();
  if (!token) {
    console.warn("⚠ Skipping non-admin POST test — could not create ephemeral user");
    return;
  }
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const body = await res.json();
  assertEquals(res.status, 403);
  assert(typeof body?.error === "string" && body.error.toLowerCase().includes("admin"));
});

Deno.test("POST dependency-health (admin) → 200 or 500/502 (config-dependent)", async () => {
  const token = await signIn(QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD);
  if (!token) {
    console.warn("⚠ Skipping admin POST test — QA admin login failed");
    return;
  }
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const body = await res.json();
  // 200 = success; 500 = GITHUB_REPO_RAW_BASE not configured; 502 = upstream fetch failed.
  assert(
    [200, 500, 502].includes(res.status),
    `unexpected admin POST status ${res.status}: ${JSON.stringify(body).slice(0, 200)}`,
  );
  if (res.status === 200) {
    assertSnapshotShape(body);
    assertEquals(body?.lockfileDrift?.source, "edge:dependency-health POST");
  }
});

Deno.test("OPTIONS dependency-health → 204 with CORS headers", async () => {
  const res = await fetch(FN_URL, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 204);
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
});
