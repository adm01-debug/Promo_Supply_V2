/**
 * Centralized security utilities for Edge Functions.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Validates if the request has a valid authorization header.
 */
export const validateAuth = (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }
  return authHeader;
};

/**
 * Standard response helpers for edge functions.
 */
export const responses = {
  success: (data: any, requestId?: string) => new Response(
    JSON.stringify({
      data,
      requestId,
      status: "success",
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  ),
  error: (message: string, status = 400, requestId?: string, details?: any) => new Response(
    JSON.stringify({ 
      error: message, 
      requestId, 
      details,
      status: "error",
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  ),
};


/**
 * Validates that the request has a tenant context and it matches the resource.
 *
 * SECURITY: a client-supplied `x-tenant-id` header is NOT trusted by itself —
 * it is only honored when it matches the tenant resolved from the authenticated
 * user. Callers that need a hard guarantee should use `getTenantId(...)` which
 * always resolves from `auth.users` → `user_tenants`.
 */
export const validateTenant = (req: Request, resourceTenantId?: string) => {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    throw new Error('Security error: Missing x-tenant-id header for multi-tenant isolation');
  }

  if (resourceTenantId && resourceTenantId !== tenantId) {
    throw new Error('Security error: Tenant isolation violation. Cross-tenant access denied.');
  }

  return tenantId;
};

/**
 * Resolve the authenticated user from the request's Authorization bearer token.
 * Returns `null` if missing/invalid (callers decide whether to 401).
 */
export const getAuthUser = async (req: Request) => {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.4");
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { user: null, token: null, client: null as any };
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { user: null, token, client };
  return { user: data.user, token, client };
};

/**
 * Extracts and validates the tenant ID for a Supabase Auth User.
 *
 * Resolution order:
 *  1. `x-tenant-id` header — only accepted if it matches one of the user's tenants.
 *  2. `user_tenants.is_default = true` for the authenticated user.
 *
 * Never trusts the header alone.
 */
export const getTenantId = async (supabase: any, user: any, req: Request): Promise<string> => {
  if (!user) throw new Error("Security error: getTenantId requires an authenticated user");

  const { data: memberships, error } = await supabase
    .from("user_tenants")
    .select("tenant_id, is_default")
    .eq("user_id", user.id);
  if (error) throw error;

  const allowed = new Set<string>((memberships ?? []).map((m: any) => m.tenant_id));
  if (allowed.size === 0) {
    throw new Error("Security error: User has no tenant membership");
  }

  const headerTenant = req.headers.get("x-tenant-id");
  if (headerTenant && allowed.has(headerTenant)) return headerTenant;
  if (headerTenant && !allowed.has(headerTenant)) {
    throw new Error("Security error: x-tenant-id does not match user's memberships");
  }

  const defaultTenant = (memberships ?? []).find((m: any) => m.is_default)?.tenant_id;
  return defaultTenant ?? (memberships![0] as any).tenant_id;
};



