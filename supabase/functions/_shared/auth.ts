// Auth helpers shared by edge functions. Use these instead of trusting
// request headers or body fields for identity / tenant.
//
// Deno runtime — exposed to functions via relative import from `_shared/auth.ts`.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export interface AuthedUser {
  id: string;
  email: string | null;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * Verify the Authorization header and return the authenticated user.
 * Throws AuthError(401) when no token or invalid token.
 */
export async function requireUser(req: Request): Promise<{ user: AuthedUser; token: string }> {
  const header = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    throw new AuthError("Missing or malformed Authorization header", 401);
  }
  const token = header.slice(7).trim();
  if (!token) throw new AuthError("Empty bearer token", 401);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new AuthError("Server misconfigured: SUPABASE_URL/ANON_KEY missing", 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new AuthError("Invalid token", 401);

  return { user: { id: data.user.id, email: data.user.email ?? null }, token };
}

/**
 * Verify the user is a member of `tenantId` according to `user_tenants`.
 * Uses service role to bypass RLS for the check; throws AuthError(403) on miss.
 */
export async function requireTenantMembership(
  userId: string,
  tenantId: string,
  service: SupabaseClient = serviceClient(),
): Promise<void> {
  if (!tenantId) throw new AuthError("Tenant id required", 400);
  const { data, error } = await service
    .from("user_tenants")
    .select("user_id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle();
  if (error) throw new AuthError(`Tenant lookup failed: ${error.message}`, 500);
  if (!data) throw new AuthError("Not a member of this tenant", 403);
}

/**
 * Fetch the user's default/primary tenant id from user_tenants.
 * Returns null if none. Useful when the function operates on the caller's tenant
 * rather than a tenant supplied by the client.
 */
export async function getUserDefaultTenant(
  userId: string,
  service: SupabaseClient = serviceClient(),
): Promise<string | null> {
  const { data } = await service
    .from("user_tenants")
    .select("tenant_id, is_default")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.tenant_id ?? null;
}

export function serviceClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new AuthError("Server misconfigured: SERVICE_ROLE_KEY missing", 500);
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** Construct a JSON Response with proper CORS + status. */
export function jsonResponse(body: unknown, init: ResponseInit & { cors?: Record<string, string> } = {}) {
  const corsHeaders = init.cors ?? {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

/** Convert any thrown error into a safe JSON response. */
export function errorToResponse(err: unknown, cors?: Record<string, string>): Response {
  if (err instanceof AuthError) {
    return jsonResponse({ error: err.message }, { status: err.status, cors });
  }
  const message = err instanceof Error ? err.message : "Internal error";
  return jsonResponse({ error: message }, { status: 500, cors });
}
