// Edge Function: health-dashboard
// Onda 31 — Expõe visão consolidada da saúde do banco para admins.
// - Requer JWT válido de usuário com role 'admin' (via public.has_role).
// - Retorna: alertas abertos agrupados (v_system_health_overview),
//   últimas 10 execuções do orquestrador (health_scan_runs) e
//   contagem total de alertas por severidade nas últimas 24h.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildResponseHeaders } from "../_shared/http.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: buildResponseHeaders(corsHeaders),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    return json({ error: "Server misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Unauthorized" }, 401);

  // 1. Valida o usuário via anon client
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

  // 2. Checa role 'admin' via service role (bypassa RLS na função has_role)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleErr) return json({ error: "Role check failed" }, 500);
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  // 2b. Rota alternativa: detalhe de um único alerta + timeline (audit_logs)
  const url = new URL(req.url);
  const alertId = url.searchParams.get("alert_id");
  if (alertId) {
    const [alertRes, auditRes, relatedRes] = await Promise.all([
      admin
        .from("system_alerts")
        .select("id, alert_type, severity, message, metadata, created_at, resolved_at, resolved_by")
        .eq("id", alertId)
        .maybeSingle(),
      admin
        .from("audit_logs")
        .select("id, action, actor_id, created_at, metadata")
        .eq("resource_type", "system_alert")
        .eq("resource_id", alertId)
        .order("created_at", { ascending: true }),
      admin
        .from("system_alerts")
        .select("id, severity, created_at, resolved_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (alertRes.error) return json({ error: alertRes.error.message }, 500);
    if (!alertRes.data) return json({ error: "Alert not found" }, 404);
    return json({
      alert: alertRes.data,
      timeline: auditRes.data ?? [],
      related_same_type: (relatedRes.data ?? []).filter(
        (r: { id: string }) => r.id !== alertId,
      ),
    });
  }


  // 3. Consulta paralela dos datasets
  const [overviewRes, runsRes, severityRes, tsRes, mttrRes, noisyRes, openRes] = await Promise.all([
    admin.from("v_system_health_overview").select("*"),
    admin
      .from("health_scan_runs")
      .select("id, started_at, finished_at, duration_ms, ok_count, failed_count, results")
      .order("started_at", { ascending: false })
      .limit(10),
    admin
      .from("system_alerts")
      .select("severity")
      .is("resolved_at", null)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    admin.rpc("alerts_severity_timeseries", { days: 7 }),
    admin.rpc("alerts_mttr_by_type", { days: 7 }),
    admin.rpc("alerts_noisy_scanners", { days: 1 }),
    admin
      .from("system_alerts")
      .select("id, alert_type, severity, message, created_at, metadata")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);


  if (overviewRes.error) return json({ error: overviewRes.error.message }, 500);
  if (runsRes.error) return json({ error: runsRes.error.message }, 500);
  if (severityRes.error) return json({ error: severityRes.error.message }, 500);
  if (tsRes.error) return json({ error: tsRes.error.message }, 500);
  if (mttrRes.error) return json({ error: mttrRes.error.message }, 500);
  if (noisyRes.error) return json({ error: noisyRes.error.message }, 500);
  if (openRes.error) return json({ error: openRes.error.message }, 500);

  const severityCounts: Record<string, number> = {};
  for (const row of severityRes.data ?? []) {
    const sev = (row as { severity: string }).severity ?? "UNKNOWN";
    severityCounts[sev] = (severityCounts[sev] ?? 0) + 1;
  }

  // Pivota timeseries por dia
  const tsMap = new Map<string, Record<string, number | string>>();
  for (const row of (tsRes.data ?? []) as Array<{ day: string; severity: string; cnt: number }>) {
    const key = String(row.day);
    const bucket = tsMap.get(key) ?? { day: key };
    bucket[row.severity] = Number(row.cnt);
    tsMap.set(key, bucket);
  }
  const severity_timeseries_7d = Array.from(tsMap.values()).sort((a, b) =>
    String(a.day).localeCompare(String(b.day)),
  );

  return json({
    generated_at: new Date().toISOString(),
    open_alerts_by_type: overviewRes.data,
    last_runs: runsRes.data,
    severity_counts_24h: severityCounts,
    severity_timeseries_7d,
    mttr_by_type_7d: mttrRes.data ?? [],
    noisy_scanners_24h: noisyRes.data ?? [],
    open_alerts: openRes.data ?? [],
  });
});

