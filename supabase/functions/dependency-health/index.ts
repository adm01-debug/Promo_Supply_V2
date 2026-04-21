import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_REPO_RAW_BASE = Deno.env.get("GITHUB_REPO_RAW_BASE") ?? "";

interface DependencyHealthSnapshot {
  generatedAt: string;
  dateFns: {
    spec: string;
    installed: string;
    locked: string;
    exactPinned: boolean;
  };
  lockfileDrift: {
    detected: boolean;
    lastCheckedAt: string;
    source: string;
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolveLockedVersion(lockText: string, pkg: string): string | null {
  const esc = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const V = String.raw`(\d+\.\d+\.\d+(?:[-+][\w.]+)?)`;
  const patterns = [
    new RegExp(`"${esc}@${V}"`),
    new RegExp(`"${esc}@npm:${esc}@${V}"`),
    new RegExp(`(?:^|\\s)${esc}@${V}\\s*:`, "m"),
  ];
  for (const re of patterns) {
    const m = lockText.match(re);
    if (m) return m[1];
  }
  return null;
}

async function fetchStaticFallback(origin: string): Promise<DependencyHealthSnapshot | null> {
  try {
    const res = await fetch(`${origin}/dependency-health.json`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function handleGet(req: Request): Promise<Response> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await admin
    .from("dependency_health")
    .select("payload")
    .eq("id", true)
    .maybeSingle();

  if (data?.payload) {
    return json(data.payload);
  }

  // Fallback to static JSON from Origin (or referer)
  const origin = req.headers.get("origin") ?? req.headers.get("referer")?.replace(/\/[^/]*$/, "") ?? "";
  if (origin) {
    const fallback = await fetchStaticFallback(origin);
    if (fallback) return json(fallback);
  }

  // Last-resort stub
  const stub: DependencyHealthSnapshot = {
    generatedAt: new Date().toISOString(),
    dateFns: { spec: "", installed: "", locked: "", exactPinned: false },
    lockfileDrift: {
      detected: false,
      lastCheckedAt: new Date().toISOString(),
      source: "edge:dependency-health fallback-stub",
    },
  };
  return json(stub);
}

async function handlePost(req: Request): Promise<Response> {
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Missing Authorization header" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleErr || !isAdmin) return json({ error: "Forbidden: admin only" }, 403);

  if (!GITHUB_REPO_RAW_BASE) {
    return json({ error: "GITHUB_REPO_RAW_BASE secret not configured" }, 500);
  }

  const base = GITHUB_REPO_RAW_BASE.replace(/\/+$/, "");
  const [pkgRes, lockRes] = await Promise.all([
    fetch(`${base}/package.json`, { signal: AbortSignal.timeout(10000) }),
    fetch(`${base}/bun.lock`, { signal: AbortSignal.timeout(10000) }),
  ]);
  if (!pkgRes.ok) return json({ error: `Failed to fetch package.json (${pkgRes.status})` }, 502);
  if (!lockRes.ok) return json({ error: `Failed to fetch bun.lock (${lockRes.status})` }, 502);

  const pkg = await pkgRes.json();
  const lockText = await lockRes.text();

  const spec: string = pkg?.dependencies?.["date-fns"] ?? "";
  const locked = resolveLockedVersion(lockText, "date-fns") ?? "";
  const installed = locked;
  const exactPinned = /^\d+\.\d+\.\d+$/.test(spec);
  const normalizedSpec = spec.replace(/^[\^~]/, "");
  const driftDetected = Boolean(spec && locked && normalizedSpec !== locked);
  const now = new Date().toISOString();

  const payload: DependencyHealthSnapshot = {
    generatedAt: now,
    dateFns: { spec, installed, locked, exactPinned },
    lockfileDrift: {
      detected: driftDetected,
      lastCheckedAt: now,
      source: "edge:dependency-health POST",
    },
  };

  const { error: upsertErr } = await admin
    .from("dependency_health")
    .upsert({ id: true, payload, updated_by: userData.user.id, updated_at: now });
  if (upsertErr) return json({ error: `Upsert failed: ${upsertErr.message}` }, 500);

  return json(payload);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  try {
    if (req.method === "GET") return await handleGet(req);
    if (req.method === "POST") return await handlePost(req);
    return json({ error: "Method not allowed" }, 405);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return json({ error: msg }, 500);
  }
});
