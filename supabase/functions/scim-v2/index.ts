import { corsHeaders } from "../_shared/security.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://esm.sh/zod@3.22.4";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";
import { evaluateScimGate, sha256Hex } from "./auth.ts";

// RFC 7643 §4.1 — SCIM User resource schemas
const ScimUserPostSchema = z.object({
  emails: z.array(z.object({ value: z.string().email(), primary: z.boolean().optional() })).min(1),
  displayName: z.string().min(1).optional(),
  name: z.object({ formatted: z.string().min(1).optional() }).optional(),
}).refine((v) => !!(v.displayName || v.name?.formatted), {
  message: "displayName or name.formatted is required",
});

// RFC 7644 §3.5.1 — PATCH Operations
const ScimPatchSchema = z.object({
  schemas: z.array(z.string()).optional(),
  Operations: z.array(z.object({
    op: z.enum(["Add", "Remove", "Replace", "add", "remove", "replace"]),
    path: z.string().optional(),
    value: z.unknown().optional(),
  })).min(1),
});

function scimErrorResponse(detail: string, status: number, headers: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail,
      status: String(status),
    }),
    { status, headers: buildResponseHeaders(headers) },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid token" }), {
        status: 401,
        headers: buildResponseHeaders(corsHeaders),
      });
    }


    // M-05: rate-limit por IP (SCIM é chamado por IdP externo, sem user.id).
    const ip = req.headers.get("cf-connecting-ip")
      ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim()
      ?? "unknown";
    const rl = await checkRateLimit({
      identifier: `scim:${ip}`,
      endpoint: "scim-v2",
      maxRequests: 120,
      windowSeconds: 60,
    });
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds, corsHeaders);

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Dois caminhos de credencial: o token por tenant (hash em sso_configurations,
    // gerado em Configurações > SSO) e o token global legado (SCIM_BEARER_TOKEN).
    const tokenHash = await sha256Hex(token);
    const { data: configs, error: configError } = await supabaseAdmin
      .from("sso_configurations")
      .select("id, scim_token_hash")
      .eq("is_active", true)
      .not("scim_token_hash", "is", null);

    if (configError) throw configError;

    // QA-047 (EDGA-07): as duas fontes concorrem em ALTERNATIVA. A decisao
    // fica em ./auth.ts para ser testavel sem rede (auth.test.ts).
    const gate = evaluateScimGate(
      token,
      tokenHash,
      (configs ?? []).map((config) => config.scim_token_hash),
      Deno.env.get("SCIM_BEARER_TOKEN"),
    );
    if (!gate.ok) {
      const detail = gate.error;
      if (gate.status === 503) {
        console.error("SCIM has no credential configured; rejecting request");
        return new Response(JSON.stringify({ error: detail }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: detail }), {
        status: 401,
        headers: buildResponseHeaders(corsHeaders),
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const resourceType = pathParts[1]; // e.g., 'Users' or 'Groups'
    const resourceId = pathParts[2];

    // Simple SCIM 2.0 Router
    if (resourceType === "Users") {
      if (req.method === "GET") {
        if (resourceId) {
          // Get single user
          const { data, error } = await supabaseAdmin.auth.admin.getUserById(resourceId);
          if (error) throw error;
          return new Response(JSON.stringify(mapSupabaseUserToSCIM(data.user)), {
            headers: buildResponseHeaders(corsHeaders),
          });
        } else {
          // List users
          const { data, error } = await supabaseAdmin.auth.admin.listUsers();
          if (error) throw error;
          return new Response(JSON.stringify({
            schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            totalResults: data.users.length,
            Resources: data.users.map(mapSupabaseUserToSCIM),
          }), {
            headers: buildResponseHeaders(corsHeaders),
          });
        }
      }

      if (req.method === "POST") {
        const rawBody = await req.json().catch(() => null);
        const parsed = ScimUserPostSchema.safeParse(rawBody);
        if (!parsed.success) {
          return scimErrorResponse(
            parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
            400,
            corsHeaders,
          );
        }

        const email = parsed.data.emails[0].value;
        const displayName = parsed.data.displayName ?? parsed.data.name?.formatted ?? email;

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: displayName },
        });

        if (error) throw error;

        const scimUser = mapSupabaseUserToSCIM(data.user);
        // RFC 7644 §3.3: 201 response MUST include a Location header
        const locationHeader = `${url.origin}${url.pathname.replace(/\/$/, "")}/Users/${data.user.id}`;
        return new Response(JSON.stringify(scimUser), {
          status: 201,
          headers: { ...buildResponseHeaders(corsHeaders), Location: locationHeader },
        });
      }

      // RFC 7644 §3.5.1 — PATCH: partial attribute update via Operations array
      if (req.method === "PATCH" && resourceId) {
        const rawBody = await req.json().catch(() => null);
        const parsed = ScimPatchSchema.safeParse(rawBody);
        if (!parsed.success) {
          return scimErrorResponse(
            parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
            400,
            corsHeaders,
          );
        }

        // Map SCIM Operations to Supabase user_metadata fields
        const metaUpdates: Record<string, unknown> = {};
        for (const op of parsed.data.Operations) {
          const normalizedOp = op.op.toLowerCase();
          if ((normalizedOp === "replace" || normalizedOp === "add") && op.path && op.value !== undefined) {
            if (op.path === "displayName") metaUpdates["full_name"] = op.value;
            // Additional SCIM attribute mappings can be added here
          }
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(resourceId, {
          user_metadata: metaUpdates,
        });
        if (error) throw error;

        return new Response(JSON.stringify(mapSupabaseUserToSCIM(data.user)), {
          status: 200,
          headers: buildResponseHeaders(corsHeaders),
        });
      }

      if (req.method === "DELETE" && resourceId) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(resourceId);
        if (error) throw error;
        // RFC 7644 §3.6: 204 No Content — empty body
        return new Response(null, {
          status: 204,
          headers: { ...buildResponseHeaders(corsHeaders), "content-length": "0" },
        });
      }
    }

    return scimErrorResponse("Method not supported", 405, corsHeaders);

  } catch (error: unknown) {
    console.error("SCIM Error:", error);
    const message = error instanceof Error ? error.message : "SCIM request failed";
    // RFC 7644 §3.12: all errors must use the SCIM Error schema
    return scimErrorResponse(message, 400, corsHeaders);
  }
});

function mapSupabaseUserToSCIM(user: any) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.id,
    userName: user.email,
    displayName: user.user_metadata?.full_name || user.email,
    emails: [{ value: user.email, primary: true }],
    active: true,
    meta: {
      resourceType: "User",
      created: user.created_at,
      lastModified: user.updated_at,
    },
  };
}
