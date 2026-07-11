/**
 * Centralized security utilities for Edge Functions.
 *
 * M-02: o header legado `x-tenant-id` foi **descontinuado**. A resolução de
 * tenant agora é feita exclusivamente a partir do usuário autenticado
 * (`user_tenants`) — o header, se presente, é apenas logado como aviso e
 * ignorado para autorização.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
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
 * @deprecated M-02: use `getAuthUser` + `getTenantId` (que resolvem tenant a partir do usuário).
 * Mantido apenas para não quebrar callers legados durante a migração.
 * A partir desta versão, o header `x-tenant-id` é ignorado — sempre lança se
 * chamado sem contexto autenticado prévio.
 */
export const validateTenant = (_req: Request, _resourceTenantId?: string): string => {
  throw new Error(
    "validateTenant() está descontinuado (M-02). Use getAuthUser(req) + getTenantId(client, user) para resolver o tenant via user_tenants."
  );
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
 * Resolve o tenant do usuário autenticado consultando `user_tenants`.
 *
 * M-02: o header `x-tenant-id` **não** é mais aceito. Se o caller precisa
 * alternar entre múltiplas empresas do grupo, deve passar `preferredTenantId`
 * explicitamente (validado contra as memberships).
 */
export const getTenantId = async (
  supabase: any,
  user: any,
  preferredTenantId?: string,
): Promise<string> => {
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

  if (preferredTenantId) {
    if (!allowed.has(preferredTenantId)) {
      throw new Error("Security error: preferredTenantId does not match user's memberships");
    }
    return preferredTenantId;
  }

  const defaultTenant = (memberships ?? []).find((m: any) => m.is_default)?.tenant_id;
  return defaultTenant ?? (memberships![0] as any).tenant_id;
};
