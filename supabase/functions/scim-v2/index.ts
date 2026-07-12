import { corsHeaders } from "../_shared/security.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";

const encoder = new TextEncoder();

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const tokenHash = await sha256Hex(token);
    const { data: configs, error: configError } = await supabaseAdmin
      .from("sso_configurations")
      .select("id, scim_token_hash")
      .eq("is_active", true)
      .not("scim_token_hash", "is", null);

    if (configError) throw configError;

    const isTokenValid = (configs ?? []).some((config) =>
      typeof config.scim_token_hash === "string" && safeEqual(config.scim_token_hash, tokenHash)
    );

    if (!isTokenValid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
        const body = await req.json();
        const email = body.emails?.[0]?.value;
        const displayName = body.displayName || body.name?.formatted;

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: displayName },
        });

        if (error) throw error;
        
        return new Response(JSON.stringify(mapSupabaseUserToSCIM(data.user)), {
          status: 201,
          headers: buildResponseHeaders(corsHeaders),
        });
      }
      
      if (req.method === "DELETE" && resourceId) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(resourceId);
        if (error) throw error;
        return new Response(null, { status: 204, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: "Method not supported" }), {
      status: 405,
      headers: buildResponseHeaders(corsHeaders),
    });

  } catch (error: unknown) {
    console.error("SCIM Error:", error);
    const message = error instanceof Error ? error.message : "SCIM request failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: buildResponseHeaders(corsHeaders),
    });
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
