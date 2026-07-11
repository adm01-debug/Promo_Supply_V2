import { corsHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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

interface DispatchInfo {
  status: string;
  branch?: string;
  dispatchedAt?: string;
  workflowRunUrl?: string;
  workflowRunId?: number;
  workflowRunStatus?: string;
  latestCommitSha?: string;
  latestCommitUrl?: string;
  latestCommitMessage?: string;
  latestCommitAuthor?: string;
  latestCommitAt?: string;
}

function deriveBranch(rawBase: string): string {
  try {
    const u = new URL(rawBase);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[2] ?? "main";
  } catch {
    return "main";
  }
}

async function fetchLatestCommit(
  owner: string,
  repo: string,
  branch: string,
): Promise<Pick<DispatchInfo, "latestCommitSha" | "latestCommitUrl" | "latestCommitMessage" | "latestCommitAuthor" | "latestCommitAt">> {
  if (!GITHUB_DISPATCH_TOKEN) return {};
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_DISPATCH_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      await res.text().catch(() => "");
      return {};
    }
    // deno-lint-ignore no-explicit-any
    const body: any = await res.json();
    return {
      latestCommitSha: body?.sha,
      latestCommitUrl: body?.html_url,
      latestCommitMessage: String(body?.commit?.message ?? "").split("\n")[0]?.slice(0, 200),
      latestCommitAuthor: body?.commit?.author?.name ?? body?.author?.login,
      latestCommitAt: body?.commit?.author?.date,
    };
  } catch {
    return {};
  }
}

async function fetchLatestWorkflowRun(
  owner: string,
  repo: string,
  branch: string,
  dispatchedAtMs: number,
): Promise<Pick<DispatchInfo, "workflowRunUrl" | "workflowRunId" | "workflowRunStatus">> {
  if (!GITHUB_DISPATCH_TOKEN) return {};
  // GitHub takes a moment to register the run after dispatch; poll briefly.
  for (let attempt = 0; attempt < 4; attempt++) {
    await new Promise((r) => setTimeout(r, attempt === 0 ? 800 : 1200));
    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${DISPATCH_WORKFLOW_FILE}/runs?branch=${encodeURIComponent(branch)}&event=workflow_dispatch&per_page=5`,
        {
          headers: {
            Authorization: `Bearer ${GITHUB_DISPATCH_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!res.ok) {
        await res.text().catch(() => "");
        continue;
      }
      // deno-lint-ignore no-explicit-any
      const body: any = await res.json();
      // deno-lint-ignore no-explicit-any
      const runs: any[] = Array.isArray(body?.workflow_runs) ? body.workflow_runs : [];
      const match = runs.find((r) => {
        const created = Date.parse(r?.created_at ?? "");
        return Number.isFinite(created) && created >= dispatchedAtMs - 5000;
      }) ?? runs[0];
      if (match) {
        return {
          workflowRunUrl: match.html_url,
          workflowRunId: match.id,
          workflowRunStatus: match.status,
        };
      }
    } catch {
      // try again
    }
  }
  return {};
}

async function dispatchWorkflow(rawBase: string): Promise<DispatchInfo> {
  if (!GITHUB_DISPATCH_TOKEN) return { status: "skipped: GITHUB_DISPATCH_TOKEN not configured" };
  const or = deriveOwnerRepo(rawBase);
  if (!or) return { status: "skipped: owner/repo not derivable from GITHUB_REPO_RAW_BASE" };
  const branch = deriveBranch(rawBase);
  const url = `https://api.github.com/repos/${or.owner}/${or.repo}/actions/workflows/${DISPATCH_WORKFLOW_FILE}/dispatches`;
  const dispatchedAt = new Date();
  try {
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
    if (res.status !== 204) {
      const text = await res.text().catch(() => "");
      return {
        status: `failed: HTTP ${res.status} ${text.slice(0, 200)}`,
        branch,
        dispatchedAt: dispatchedAt.toISOString(),
      };
    }
    const [run, commit] = await Promise.all([
      fetchLatestWorkflowRun(or.owner, or.repo, branch, dispatchedAt.getTime()),
      fetchLatestCommit(or.owner, or.repo, branch),
    ]);
    return {
      status: "queued",
      branch,
      dispatchedAt: dispatchedAt.toISOString(),
      ...run,
      ...commit,
    };
  } catch (e) {
    return {
      status: `failed: ${e instanceof Error ? e.message : String(e)}`,
      branch,
      dispatchedAt: dispatchedAt.toISOString(),
    };
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

/**
 * GET ?prSmoke=true — find the most recent CI artifact whose name starts
 * with `dependency-health-smoke-` (uploaded by the smoke workflow on
 * pull_request events) and return its metadata. We deliberately DO NOT
 * download/unzip the artifact body here: the GitHub Artifacts API only
 * exposes the zip via a redirect that requires `actions:read` and would
 * blow our edge timeout for repeated calls. Instead we surface enough
 * metadata for the UI to link out to the run + the artifact download
 * page, plus the originating PR/commit context so reviewers can jump
 * straight to the failing change. A future enhancement could stream +
 * unzip the body server-side, but that needs caching to be useful.
 */
async function handlePrSmoke(): Promise<Response> {
  if (!GITHUB_DISPATCH_TOKEN) {
    return json({ status: "skipped", reason: "GITHUB_DISPATCH_TOKEN not configured" });
  }
  const or = deriveOwnerRepo(GITHUB_REPO_RAW_BASE);
  if (!or) {
    return json({ status: "skipped", reason: "owner/repo not derivable from GITHUB_REPO_RAW_BASE" });
  }
  // List artifacts (most recent first). The API returns 30 by default which
  // is plenty given our retention is 14 days. Filter client-side by prefix.
  try {
    const res = await fetch(
      `https://api.github.com/repos/${or.owner}/${or.repo}/actions/artifacts?per_page=100`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${GITHUB_DISPATCH_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      return json(
        { status: "error", reason: `GitHub API ${res.status}`, artifact: null },
        res.status === 401 || res.status === 403 ? 200 : 502,
      );
    }
    // deno-lint-ignore no-explicit-any
    const body: any = await res.json();
    // deno-lint-ignore no-explicit-any
    const all: any[] = Array.isArray(body?.artifacts) ? body.artifacts : [];
    // Only PR smoke artifacts; skip expired ones (download_url 410s).
    const prArtifacts = all
      .filter((a) => typeof a?.name === "string" && a.name.startsWith("dependency-health-smoke-"))
      .filter((a) => a?.expired !== true)
      .sort(
        (a, b) =>
          new Date(b?.created_at ?? 0).getTime() - new Date(a?.created_at ?? 0).getTime(),
      );
    const latest = prArtifacts[0];
    if (!latest) {
      return json({ status: "empty", artifact: null });
    }
    const wf = latest.workflow_run ?? {};
    return json({
      status: "ok",
      artifact: {
        id: latest.id,
        name: latest.name,
        sizeBytes: latest.size_in_bytes,
        createdAt: latest.created_at,
        expiresAt: latest.expires_at,
        downloadUrl: latest.archive_download_url,
        webUrl: `https://github.com/${or.owner}/${or.repo}/actions/runs/${wf.id ?? ""}`,
        runId: wf.id ?? null,
        headBranch: wf.head_branch ?? null,
        headSha: wf.head_sha ?? null,
        // Heuristic: artifact name suffix is the PR number when the workflow
        // tags it that way (`dependency-health-smoke-${{ github.event.number }}`).
        prNumber: (() => {
          const m = /dependency-health-smoke-(\d+)/.exec(latest.name);
          return m ? Number(m[1]) : null;
        })(),
      },
      totalScanned: prArtifacts.length,
    });
  } catch (e) {
    return json({
      status: "error",
      reason: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      artifact: null,
    });
  }
}

async function handleGet(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.searchParams.get("history") === "true") {
    return await handleHistory();
  }
  if (url.searchParams.get("prSmoke") === "true") {
    return await handlePrSmoke();
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

async function fetchWithRetry(
  url: string,
  { retries = 3, baseDelayMs = 300, timeoutMs = 10_000 }: {
    retries?: number;
    baseDelayMs?: number;
    timeoutMs?: number;
  } = {},
): Promise<{ ok: true; res: Response } | { ok: false; status: number; reason: string; attempts: number }> {
  let lastStatus = 0;
  let lastReason = "";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return { ok: true, res };
      lastStatus = res.status;
      lastReason = `HTTP ${res.status}`;
      // Only retry on transient upstream errors (5xx, 408, 429).
      const transient = res.status >= 500 || res.status === 408 || res.status === 429;
      // Drain the body so the connection can be reused.
      await res.text().catch(() => "");
      if (!transient) return { ok: false, status: res.status, reason: lastReason, attempts: attempt };
    } catch (e) {
      lastStatus = 0;
      lastReason = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
    if (attempt < retries) {
      // Exponential backoff with jitter: 300ms, 600ms, 1200ms (+/- 25%).
      const delay = baseDelayMs * 2 ** (attempt - 1);
      const jitter = delay * (Math.random() * 0.5 - 0.25);
      await new Promise((r) => setTimeout(r, Math.max(50, delay + jitter)));
    }
  }
  return { ok: false, status: lastStatus, reason: lastReason, attempts: retries };
}

async function handlePost(req: Request): Promise<Response> {
  const FORBIDDEN_MESSAGE = "Forbidden: admin role required";
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: FORBIDDEN_MESSAGE }, 403);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: FORBIDDEN_MESSAGE }, 403);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleErr || !isAdmin) return json({ error: FORBIDDEN_MESSAGE }, 403);

  if (!GITHUB_REPO_RAW_BASE) {
    return json({ error: "GITHUB_REPO_RAW_BASE secret not configured" }, 500);
  }

  const base = GITHUB_REPO_RAW_BASE.replace(/\/+$/, "");
  const [pkgResult, lockResult] = await Promise.all([
    fetchWithRetry(`${base}/package.json`),
    fetchWithRetry(`${base}/bun.lock`),
  ]);
  if (!pkgResult.ok) {
    return json({
      error: "Failed to fetch package.json from GitHub after retries",
      detail: pkgResult.reason,
      status: pkgResult.status,
      attempts: pkgResult.attempts,
      url: `${base}/package.json`,
    }, 502);
  }
  if (!lockResult.ok) {
    return json({
      error: "Failed to fetch bun.lock from GitHub after retries",
      detail: lockResult.reason,
      status: lockResult.status,
      attempts: lockResult.attempts,
      url: `${base}/bun.lock`,
    }, 502);
  }

  const pkg = await pkgResult.res.json();
  const lockText = await lockResult.res.text();

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

  // Audit log: record snapshot recompute
  const driftCountForAudit = packages.filter((p) => p.driftDetected).length;
  const { error: auditErr } = await admin.from("audit_logs").insert({
    action_type: "update",
    entity_type: "configuracao",
    entity_id: "dependency_health",
    entity_description: "Dependency health snapshot recomputed",
    user_id: userData.user.id,
    user_email: userData.user.email ?? null,
    user_name:
      (userData.user.user_metadata as Record<string, unknown> | null)?.full_name as string ??
        userData.user.email ?? null,
    ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: req.headers.get("user-agent") ?? null,
    new_values: {
      generatedAt: now,
      updated_at: now,
      drift_count: driftCountForAudit,
      barrel_imports: treeShaking?.barrelImportsFound ?? 0,
      packages: packages.map((p) => ({
        name: p.name,
        spec: p.spec,
        locked: p.locked,
        driftDetected: p.driftDetected,
      })),
    },
    metadata: {
      source: "edge:dependency-health POST",
      github_repo_raw_base: GITHUB_REPO_RAW_BASE,
      tree_shaking_source: treeShaking?.note ?? null,
      tree_shaking_risk: treeShaking?.riskLevel ?? null,
    },
  });
  if (auditErr) console.error("audit insert failed:", auditErr.message);

  // Append to history + prune to last 30
  const driftCount = driftCountForAudit;
  const barrelImports = treeShaking?.barrelImportsFound ?? 0;
  const { error: histErr } = await admin.from("dependency_health_history").insert({
    payload,
    drift_count: driftCount,
    barrel_imports: barrelImports,
    generated_at: now,
    created_by: userData.user.id,
  });
  if (histErr) {
    console.error("history insert failed:", histErr.message);
  } else {
    const { data: keepRows } = await admin
      .from("dependency_health_history")
      .select("id")
      .order("generated_at", { ascending: false })
      .limit(30);
    const keepIds = (keepRows ?? []).map((r: { id: string }) => r.id);
    if (keepIds.length > 0) {
      const { error: pruneErr } = await admin
        .from("dependency_health_history")
        .delete()
        .not("id", "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`);
      if (pruneErr) console.error("history prune failed:", pruneErr.message);
    }
  }

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
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  try {
    if (req.method === "GET") return await handleGet(req);
    if (req.method === "POST") return await handlePost(req);
    return json({ error: "Method not allowed" }, 405);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Dependency health error:`, msg);
    return json({ error: msg }, 500);
  }
});
