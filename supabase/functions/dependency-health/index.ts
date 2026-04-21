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
const GITHUB_DISPATCH_TOKEN = Deno.env.get("GITHUB_DISPATCH_TOKEN") ?? "";
const DISPATCH_WORKFLOW_FILE = "dependency-health.yml";

function deriveOwnerRepo(rawBase: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(rawBase);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

async function dispatchWorkflow(rawBase: string): Promise<string> {
  if (!GITHUB_DISPATCH_TOKEN) return "skipped: GITHUB_DISPATCH_TOKEN not configured";
  const or = deriveOwnerRepo(rawBase);
  if (!or) return "skipped: owner/repo not derivable from GITHUB_REPO_RAW_BASE";
  const url = `https://api.github.com/repos/${or.owner}/${or.repo}/actions/workflows/${DISPATCH_WORKFLOW_FILE}/dispatches`;
  try {
    const branch = (() => {
      try {
        const u = new URL(rawBase);
        const parts = u.pathname.split("/").filter(Boolean);
        return parts[2] ?? "main";
      } catch {
        return "main";
      }
    })();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_DISPATCH_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: branch }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 204) return "queued";
    const text = await res.text().catch(() => "");
    return `failed: HTTP ${res.status} ${text.slice(0, 200)}`;
  } catch (e) {
    return `failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

interface PackageHealth {
  name: string;
  label: string;
  spec: string;
  installed: string;
  locked: string;
  exactPinned: boolean;
  driftDetected: boolean;
}

interface TreeShakingOffender {
  file: string;
  line: number;
  importPath: string;
}

interface TreeShakingReport {
  scannedAt: string;
  filesScanned: number;
  barrelImportsFound: number;
  offenders: TreeShakingOffender[];
  truncated?: boolean;
  riskLevel: "ok" | "warning" | "critical";
  note?: string;
}

interface DependencyHealthSnapshot {
  generatedAt: string;
  dateFns: {
    spec: string;
    installed: string;
    locked: string;
    exactPinned: boolean;
  };
  packages?: PackageHealth[];
  lockfileDrift: {
    detected: boolean;
    lastCheckedAt: string;
    source: string;
  };
  treeShaking?: TreeShakingReport;
}

async function scanTreeShakingViaGitHub(rawBase: string): Promise<TreeShakingReport | null> {
  if (!GITHUB_DISPATCH_TOKEN) return null;
  const or = deriveOwnerRepo(rawBase);
  if (!or) return null;
  const q = encodeURIComponent(`from "date-fns" repo:${or.owner}/${or.repo} path:src`);
  const url = `https://api.github.com/search/code?q=${q}&per_page=50`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_DISPATCH_TOKEN}`,
        Accept: "application/vnd.github.text-match+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    // deno-lint-ignore no-explicit-any
    const body: any = await res.json();
    const items: any[] = Array.isArray(body?.items) ? body.items : [];
    const offenders: TreeShakingOffender[] = [];
    let barrelImportsFound = 0;
    for (const item of items) {
      const matches: any[] = Array.isArray(item?.text_matches) ? item.text_matches : [];
      for (const m of matches) {
        const frag = String(m?.fragment ?? "");
        const re = /from\s+['"](date-fns(?:\/locale)?)['"]/g;
        let mm: RegExpExecArray | null;
        while ((mm = re.exec(frag)) !== null) {
          barrelImportsFound++;
          if (offenders.length < 50) {
            offenders.push({ file: String(item?.path ?? ""), line: 0, importPath: mm[1] });
          }
        }
      }
    }
    const total = typeof body?.total_count === "number" ? body.total_count : barrelImportsFound;
    const riskLevel: TreeShakingReport["riskLevel"] =
      total === 0 ? "ok" : total < 5 ? "warning" : "critical";
    return {
      scannedAt: new Date().toISOString(),
      filesScanned: items.length,
      barrelImportsFound: total,
      offenders,
      truncated: offenders.length < total,
      riskLevel,
      note: "scanned via GitHub Search API",
    };
  } catch {
    return null;
  }
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

interface TrackedEntry {
  name: string;
  label: string;
  npmName: string;
  location: "dependencies" | "devDependencies";
}

const TRACKED: TrackedEntry[] = [
  { name: "date-fns", label: "date-fns", npmName: "date-fns", location: "dependencies" },
  { name: "react", label: "React", npmName: "react", location: "dependencies" },
  { name: "vite", label: "Vite", npmName: "vite", location: "devDependencies" },
  { name: "typescript", label: "TypeScript", npmName: "typescript", location: "devDependencies" },
  {
    name: "shadcn-ui",
    label: "shadcn/ui (radix-dialog proxy)",
    npmName: "@radix-ui/react-dialog",
    location: "dependencies",
  },
];

// deno-lint-ignore no-explicit-any
function computePackageHealth(pkg: any, lockText: string, entry: TrackedEntry): PackageHealth {
  let spec: string = pkg?.[entry.location]?.[entry.npmName] ?? "";
  if (!spec) {
    const altLoc: TrackedEntry["location"] =
      entry.location === "dependencies" ? "devDependencies" : "dependencies";
    spec = pkg?.[altLoc]?.[entry.npmName] ?? "";
  }
  const locked = resolveLockedVersion(lockText, entry.npmName) ?? "";
  const installed = locked; // edge cannot read node_modules
  const exactPinned = /^\d+\.\d+\.\d+$/.test(spec);
  const normalizedSpec = spec.replace(/^[\^~]/, "");
  const driftDetected = Boolean(spec && locked && normalizedSpec !== locked);

  return {
    name: entry.name,
    label: entry.label,
    spec,
    installed,
    locked,
    exactPinned,
    driftDetected,
  };
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

async function handleHistory(): Promise<Response> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin
    .from("dependency_health_history")
    .select("id, generated_at, drift_count, barrel_imports, payload")
    .order("generated_at", { ascending: false })
    .limit(30);
  if (error) return json({ error: error.message }, 500);
  // deno-lint-ignore no-explicit-any
  const rows = (data ?? []).map((row: any) => {
    const pkgs: any[] = Array.isArray(row?.payload?.packages) ? row.payload.packages : [];
    return {
      id: row.id,
      generatedAt: row.generated_at,
      driftCount: row.drift_count,
      barrelImports: row.barrel_imports,
      packages: pkgs.map((p) => ({ name: p?.name, driftDetected: !!p?.driftDetected })),
    };
  });
  return json({ history: rows });
}

async function handleGet(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.searchParams.get("history") === "true") {
    return await handleHistory();
  }
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

  const packages = TRACKED.map((entry) => computePackageHealth(pkg, lockText, entry));
  const dateFnsEntry = packages.find((p) => p.name === "date-fns");
  const aggregateDrift = packages.some((p) => p.driftDetected);
  const now = new Date().toISOString();

  const treeShaking = await scanTreeShakingViaGitHub(GITHUB_REPO_RAW_BASE);

  const payload: DependencyHealthSnapshot = {
    generatedAt: now,
    dateFns: {
      spec: dateFnsEntry?.spec ?? "",
      installed: dateFnsEntry?.installed ?? "",
      locked: dateFnsEntry?.locked ?? "",
      exactPinned: dateFnsEntry?.exactPinned ?? false,
    },
    packages,
    lockfileDrift: {
      detected: aggregateDrift,
      lastCheckedAt: now,
      source: "edge:dependency-health POST",
    },
    ...(treeShaking ? { treeShaking } : {}),
  };

  const { error: upsertErr } = await admin
    .from("dependency_health")
    .upsert({ id: true, payload, updated_by: userData.user.id, updated_at: now });
  if (upsertErr) return json({ error: `Upsert failed: ${upsertErr.message}` }, 500);

  const url = new URL(req.url);
  if (url.searchParams.get("dispatchCi") === "true") {
    const ciDispatch = await dispatchWorkflow(GITHUB_REPO_RAW_BASE);
    return json({ ...payload, ciDispatch });
  }

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
