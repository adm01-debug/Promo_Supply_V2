import { corsHeaders } from "../_shared/security.ts";
// Edge function: migra arquivos legados dos buckets `documentos` e `comprovantes`
// do path antigo `{userId}/...` para o novo `{tenantId}/{userId}/...`.
//
// Acesso: somente POST + usuário autenticado com role admin.
// Idempotente: pula objetos cujo primeiro segmento já é um tenant_id conhecido.
// Dry-run: passe { dryRun: true } no body para apenas simular.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const BUCKETS = ["documentos", "comprovantes"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Tabelas/colunas que armazenam URLs públicas por bucket.
// Após mover {userId}/x → {tenantId}/{userId}/x, atualizamos os URLs salvos.
const URL_TARGETS: Record<string, Array<{ table: string; column: string }>> = {
  comprovantes: [
    { table: "pagamentos", column: "comprovante_url" },
    { table: "payment_history", column: "comprovante_url" },
  ],
  documentos: [
    { table: "contract_documents", column: "file_url" },
    { table: "supplier_documents", column: "file_url" },
  ],
};

interface MigrationStats {
  bucket: string;
  scanned: number;
  moved: number;
  skipped_already_new: number;
  skipped_no_tenant: number;
  url_rows_updated: number;
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
        url_rows_updated: 0,
        errors: [],
      };

      const paths = await listAll(admin, bucket, "");
      stats.scanned = paths.length;

      for (const oldPath of paths) {
        const segments = oldPath.split("/");
        const first = segments[0];

        if (UUID_RE.test(first) && validTenants.has(first)) {
          stats.skipped_already_new += 1;
          continue;
        }
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
          continue;
        }
        stats.moved += 1;

        // Atualiza URLs salvos: troca o segmento de path antigo pelo novo,
        // preservando host e query strings. publicUrl tem o formato:
        // `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
        const oldUrlFragment = `/object/public/${bucket}/${oldPath}`;
        const newUrlFragment = `/object/public/${bucket}/${newPath}`;
        for (const target of URL_TARGETS[bucket] ?? []) {
          const { data: rows, error: selErr } = await admin
            .from(target.table)
            .select(`id, ${target.column}`)
            .like(target.column, `%${oldUrlFragment}%`);
          if (selErr) {
            stats.errors.push({ path: `${target.table}.${target.column}`, error: selErr.message });
            continue;
          }
          for (const row of rows ?? []) {
            const current = (row as Record<string, unknown>)[target.column];
            if (typeof current !== "string") continue;
            const next = current.split(oldUrlFragment).join(newUrlFragment);
            if (next === current) continue;
            const { error: upErr } = await admin
              .from(target.table)
              .update({ [target.column]: next })
              .eq("id", (row as { id: string }).id);
            if (upErr) {
              stats.errors.push({ path: `${target.table}.${target.column}#${(row as { id: string }).id}`, error: upErr.message });
            } else {
              stats.url_rows_updated += 1;
            }
          }
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
