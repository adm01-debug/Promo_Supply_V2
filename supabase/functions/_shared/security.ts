/**
 * Centralized security utilities for Edge Functions.
 *
 * M-02: o header legado `x-tenant-id` foi **descontinuado**. A resolução de
 * tenant agora é feita exclusivamente a partir do usuário autenticado
 * (`user_tenants`) — o header, se presente, é apenas logado como aviso e
 * ignorado para autorização.
 */

/**
 * B-01: CORS allowlist derivada de env `ALLOWED_ORIGINS` (CSV).
 * Fallback para `*` apenas em dev/preview quando o env não é definido.
 * Aceita curinga simples via prefixo `*.` (ex.: `*.lovable.app`).
 */
const parseAllowedOrigins = (): string[] => {
  const raw = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
};

const originAllowed = (origin: string, allowlist: string[]): boolean => {
  return allowlist.some((entry) => {
    if (entry === "*") return true;
    if (entry === origin) return true;
    if (entry.startsWith("*.")) {
      const suffix = entry.slice(1); // ".lovable.app"
      try {
        const host = new URL(origin).host;
        return host.endsWith(suffix.slice(1)) || ("." + host).endsWith(suffix);
      } catch {
        return false;
      }
    }
    return false;
  });
};

const BASE_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key, x-request-id",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

/**
 * Retorna os headers CORS considerando o Origin da requisição.
 * Se o Origin não estiver na allowlist, o header Allow-Origin é omitido
 * (browser bloqueia — comportamento defensivo).
 */
export const buildCorsHeaders = (req?: Request): Record<string, string> => {
  const allowlist = parseAllowedOrigins();
  const origin = req?.headers.get("Origin") ?? "";

  // Sem allowlist configurada → dev/preview → libera geral.
  if (allowlist.length === 0) {
    return { ...BASE_CORS_HEADERS, "Access-Control-Allow-Origin": "*" };
  }

  if (origin && originAllowed(origin, allowlist)) {
    return { ...BASE_CORS_HEADERS, "Access-Control-Allow-Origin": origin };
  }
  // Origem não permitida → devolve headers sem Allow-Origin (browser bloqueia).
  return BASE_CORS_HEADERS;
};

/**
 * Compat: mantém `corsHeaders` para handlers legados.
 * Em produção, prefira `buildCorsHeaders(req)`.
 */
export const corsHeaders = {
  ...BASE_CORS_HEADERS,
  "Access-Control-Allow-Origin": "*",
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

/**
 * A-02 (Onda 47): Guarda dupla para edge functions administrativas.
 *
 * Exige (1) JWT válido de usuário autenticado e (2) role 'admin' via
 * `public.has_role`. Retorna `Response` pronta em caso de falha
 * (401 sem token/usuário, 403 sem role, 500 se lookup falhar).
 *
 * Uso:
 * ```ts
 * const guard = await requireAdmin(req);
 * if (guard.response) return guard.response;
 * const { user, admin } = guard;
 * ```
 */
export const requireAdmin = async (
  req: Request,
): Promise<
  | { response: Response; user?: undefined; admin?: undefined }
  | { response?: undefined; user: any; admin: any }
> => {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.4");
  const cors = buildCorsHeaders(req);
  const jsonHeaders = { ...cors, "Content-Type": "application/json" };

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE) {
    return {
      response: new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: jsonHeaders },
      ),
    };
  }

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return {
      response: new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: jsonHeaders },
      ),
    };
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return {
      response: new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: jsonHeaders },
      ),
    };
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleErr) {
    return {
      response: new Response(
        JSON.stringify({ error: "Role check failed" }),
        { status: 500, headers: jsonHeaders },
      ),
    };
  }
  if (!isAdmin) {
    return {
      response: new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: jsonHeaders },
      ),
    };
  }

  return { user: userData.user, admin };
};

