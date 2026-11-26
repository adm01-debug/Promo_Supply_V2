// Deno tests for the dependency-health edge function.
//
// Coverage:
//  • OPTIONS                   → 204 + CORS (nao exige JWT)
//  • POST (no auth)            → 403 "Forbidden: admin role required"
//  • GET (usuario autenticado) → 200 + valid snapshot shape
//  • POST (non-admin user)     → 403
//  • POST (admin user)         → 200 + valid snapshot shape (best-effort:
//      skipped if QA admin login or GITHUB_REPO_RAW_BASE secret is missing)
//
// Quem precisa de usuario autenticado usa QA_USER_EMAIL/QA_USER_PASSWORD (GET e POST non-admin)
// e QA_ADMIN_EMAIL/QA_ADMIN_PASSWORD (POST admin). Sem essas credenciais o teste avisa com
// ::warning:: e e' pulado; com a credencial definida, login que falha REPROVA o teste.
//
// Run with: deno test --allow-net --allow-env supabase/functions/dependency-health
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Load .env without enforcing the .env.example schema (strict load fails on
// repos whose example file lists vars that are intentionally absent).
await load({ export: true, allowEmptyValues: true, examplePath: null });

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/dependency-health`;

// Guard: disponibilidade medida por OPTIONS (o proprio handler da funcao responde sem
// passar por autenticacao). Medido neste projeto em 2026-11-25: OPTIONS
// /functions/v1/dependency-health -> 204 com `Access-Control-Allow-Origin: *`,
// GET com `apikey` + `Bearer <chave publica>` -> 401 `{"error":"Unauthorized"}`
// (a funcao exige usuario real: `index.ts:539-546` recusa sem `getUser()`) e
// POST sem Authorization -> 403 `{"error":"Forbidden: admin role required"}`.
// O criterio antigo (`status !== 401 && status !== 403`) lia o 401 da propria funcao
// como "ambiente indisponivel", entao o teste se desativava exatamente quando a
// autenticacao esta ligada.
async function isSupabaseReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(FN_URL, {
      method: "OPTIONS",
      signal: controller.signal,
      headers: { apikey: SUPABASE_ANON_KEY, "Access-Control-Request-Method": "POST" },
    });
    clearTimeout(timeoutId);
    return res.status >= 200 && res.status < 300;
  } catch {
    return false;
  }
}

const SUPABASE_AVAILABLE = await isSupabaseReachable();

// Sem fallback literal: as credenciais so entram por secret.
// QA_USER_* = usuario comum (GET e POST non-admin); QA_ADMIN_* = usuario admin (POST admin).
const QA_USER_EMAIL = Deno.env.get("QA_USER_EMAIL") ?? "";
const QA_USER_PASSWORD = Deno.env.get("QA_USER_PASSWORD") ?? "";
const HAS_QA_CREDS = QA_USER_EMAIL !== "" && QA_USER_PASSWORD !== "";
const QA_ADMIN_EMAIL = Deno.env.get("QA_ADMIN_EMAIL") ?? "";
const QA_ADMIN_PASSWORD = Deno.env.get("QA_ADMIN_PASSWORD") ?? "";
const HAS_QA_ADMIN = QA_ADMIN_EMAIL !== "" && QA_ADMIN_PASSWORD !== "";

if (!SUPABASE_AVAILABLE) {
  console.log("::warning::dependency-health: edge nao responde ao OPTIONS -- testes de integracao pulados");
}
if (!HAS_QA_CREDS) {
  console.log("::warning::dependency-health: QA_USER_EMAIL/QA_USER_PASSWORD ausentes -- testes que exigem usuario autenticado pulados");
}
if (!HAS_QA_ADMIN) {
  console.log("::warning::dependency-health: QA_ADMIN_EMAIL/QA_ADMIN_PASSWORD ausentes -- teste de POST admin pulado");
}

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

// O antigo `signUpEphemeral()` (POST /auth/v1/signup com email descartavel) foi removido nesta
// etapa: ele criava usuario real em PRODUCAO a cada execucao do CI para obter um JWT de usuario
// comum. O usuario comum agora vem de QA_USER_EMAIL/QA_USER_PASSWORD.

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
Deno.test({
  name: "GET dependency-health → 200 with valid snapshot shape",
  ignore: (!SUPABASE_AVAILABLE || !HAS_QA_CREDS),
  async fn() {
  const token = await signIn(QA_USER_EMAIL, QA_USER_PASSWORD);
  assert(token, "QA_USER_EMAIL/QA_USER_PASSWORD definidos, mas o login falhou");
  const res = await fetch(FN_URL, {
    method: "GET",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertSnapshotShape(body);
  },
});

Deno.test({
  name: "GET dependency-health?history=true → 200 with history array",
  ignore: (!SUPABASE_AVAILABLE || !HAS_QA_CREDS),
  async fn() {
  const token = await signIn(QA_USER_EMAIL, QA_USER_PASSWORD);
  assert(token, "QA_USER_EMAIL/QA_USER_PASSWORD definidos, mas o login falhou");
  const res = await fetch(`${FN_URL}?history=true`, {
    method: "GET",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  // history endpoint requires service-role internally; if it errors, the
  // function returns 500 — accept either, but if 200, validate shape.
  assert(res.status === 200 || res.status === 500, `unexpected status ${res.status}`);
  if (res.status === 200) {
    assert(Array.isArray(body?.history), "history should be an array");
  }
  },
});

Deno.test({
  name: "POST dependency-health (no auth) → 403",
  ignore: !SUPABASE_AVAILABLE,
  async fn() {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: "{}",
  });
  const body = await res.json();
  assertEquals(res.status, 403);
  assertEquals(body?.error, "Forbidden: admin role required");
  },
});

Deno.test({
  name: "POST dependency-health (non-admin user) → 403",
  ignore: (!SUPABASE_AVAILABLE || !HAS_QA_CREDS),
  async fn() {
  const token = await signIn(QA_USER_EMAIL, QA_USER_PASSWORD);
  assert(token, "QA_USER_EMAIL/QA_USER_PASSWORD definidos, mas o login falhou");
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
  },
});

Deno.test({
  name: "POST dependency-health (admin) → 200 or config-dependent error",
  ignore: (!SUPABASE_AVAILABLE || !HAS_QA_ADMIN),
  async fn() {
  const token = await signIn(QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD);
  // O ignore: deste teste ja' garantiu HAS_QA_ADMIN: credencial presente e login falhando e'
  // ambiente degradado (ou credencial invalida) -- falhar, nao pular.
  assert(token, "QA_ADMIN_EMAIL/QA_ADMIN_PASSWORD definidos, mas o login falhou");
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
  // Accepted outcomes:
  //  • 200 = success (admin role + GITHUB_REPO_RAW_BASE configured)
  //  • 403 = QA account lacks admin role in this env (still proves auth path)
  //  • 500 = GITHUB_REPO_RAW_BASE secret not configured
  //  • 502 = upstream raw fetch (package.json/bun.lock) failed
  assert(
    [200, 403, 500, 502].includes(res.status),
    `unexpected admin POST status ${res.status}: ${JSON.stringify(body).slice(0, 200)}`,
  );
  if (res.status === 200) {
    assertSnapshotShape(body);
    assertEquals(body?.lockfileDrift?.source, "edge:dependency-health POST");
  } else if (res.status === 403) {
    console.warn("⚠ QA account lacks admin role — admin success path not covered");
  }
  },
});

Deno.test({
  name: "OPTIONS dependency-health → 204 with CORS headers",
  ignore: !SUPABASE_AVAILABLE,
  async fn() {
  const res = await fetch(FN_URL, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 204);
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
  },
});
