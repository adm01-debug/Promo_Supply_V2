// Edge function: migra arquivos legados dos buckets `documentos` e `comprovantes`
// do path antigo `{userId}/...` para o novo `{tenantId}/{userId}/...`.
//
// Acesso: somente POST + usuário autenticado com role admin.
// Idempotente: pula objetos cujo primeiro segmento já é um tenant_id conhecido.
// Dry-run: passe { dryRun: true } no body para apenas simular.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKETS = ["documentos", "comprovantes"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MigrationStats {
  bucket: string;
  scanned: number;
  moved: number;
  skipped_already_new: number;
  skipped_no_tenant: number;
  errors: Array<{ path: string; error: string }>;
}

async function listAll(admin: ReturnType<typeof createClient>, bucket: string, prefix = ""): Promise<string[]> {
  // Recursivamente lista todos os paths abaixo de `prefix` no bucket.
  const out: string[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Pasta: id é null. Recursão.
      if (entry.id === null) {
        const nested = await listAll(admin, bucket, full);
        out.push(...nested);
      } else {
        out.push(full);
      }
    }
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Valida usuário e role admin.
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body?.dryRun);

    // Mapa user_id -> tenant_id a partir de profiles.
    const { data: profiles, error: pErr } = await admin
      .from("profiles")
      .select("user_id, tenant_id");
    if (pErr) throw pErr;
    const userToTenant = new Map<string, string>();
    for (const p of profiles ?? []) {
      if (p.user_id && p.tenant_id) userToTenant.set(p.user_id, p.tenant_id);
    }

    // Conjunto de tenants válidos para detectar paths já migrados.
    const validTenants = new Set<string>(Array.from(userToTenant.values()));

    const results: MigrationStats[] = [];

    for (const bucket of BUCKETS) {
      const stats: MigrationStats = {
        bucket,
        scanned: 0,
        moved: 0,
        skipped_already_new: 0,
        skipped_no_tenant: 0,
        errors: [],
      };

      const paths = await listAll(admin, bucket, "");
      stats.scanned = paths.length;

      for (const oldPath of paths) {
        const segments = oldPath.split("/");
        const first = segments[0];

        // Já migrado: primeiro segmento é um tenant conhecido.
        if (UUID_RE.test(first) && validTenants.has(first)) {
          stats.skipped_already_new += 1;
          continue;
        }

        // Esperado legado: {userId}/...
        if (!UUID_RE.test(first)) {
          stats.skipped_no_tenant += 1;
          continue;
        }
        const tenantId = userToTenant.get(first);
        if (!tenantId) {
          stats.skipped_no_tenant += 1;
          continue;
        }

        const newPath = `${tenantId}/${oldPath}`;
        if (dryRun) {
          stats.moved += 1;
          continue;
        }

        const { error: mvErr } = await admin.storage.from(bucket).move(oldPath, newPath);
        if (mvErr) {
          stats.errors.push({ path: oldPath, error: mvErr.message });
        } else {
          stats.moved += 1;
        }
      }

      results.push(stats);
    }

    return new Response(JSON.stringify({ dryRun, results }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
