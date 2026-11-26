/**
 * Resolução de identidade, tenant e credenciais XBZ.
 * Compartilhado entre `xbz-proxy` e `xbz-sync-pedidos`.
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { decryptSecret } from "./xbz_crypto.ts";
import { XbzError, type XbzPortalCredentials } from "./xbz_client.ts";

export type Role = "admin" | "coordinator" | "buyer" | "approver" | "viewer";

export interface XbzCaller {
  userId: string;
  tenantId: string;
  roles: Role[];
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Valida o JWT em código (verify_jwt = false) e resolve tenant + papéis.
 * O tenant NUNCA vem do cliente — sempre de `user_tenants`.
 */
export async function authenticate(req: Request, admin: SupabaseClient): Promise<XbzCaller> {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new XbzError(401, "Não autorizado: token ausente");
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) throw new XbzError(401, "Não autorizado: token vazio");

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) throw new XbzError(401, "Não autorizado: token inválido");

  const { data: tenantRows } = await admin
    .from("user_tenants")
    .select("tenant_id, is_default")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .limit(1);

  const tenantId = tenantRows?.[0]?.tenant_id as string | undefined;
  if (!tenantId) throw new XbzError(403, "Usuário sem empresa vinculada");

  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (roleRows ?? []).map((r) => r.role as Role);
  if (roles.length === 0) throw new XbzError(403, "Usuário sem papel atribuído");

  return { userId: user.id, tenantId, roles };
}

export function requireRole(caller: XbzCaller, allowed: readonly Role[]): void {
  if (!caller.roles.some((r) => allowed.includes(r))) {
    throw new XbzError(403, `Permissão insuficiente: requer ${allowed.join(" ou ")}`);
  }
}

export interface XbzCredentialRow {
  id: string;
  tenant_id: string;
  pessoa_id: number | null;
  cnpj: string | null;
  permissions: Record<string, boolean>;
  is_active: boolean;
}

export interface ResolvedCredentials {
  row: XbzCredentialRow;
  portal: XbzPortalCredentials;
}

/** Busca e decifra as credenciais XBZ do tenant. */
export async function loadCredentials(
  admin: SupabaseClient,
  tenantId: string,
): Promise<ResolvedCredentials> {
  const { data, error } = await admin
    .from("xbz_credentials")
    .select("id, tenant_id, pessoa_id, cnpj, permissions, is_active, portal_user_enc, portal_password_enc, deleted_at")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new XbzError(500, `Falha ao ler credenciais XBZ: ${error.message}`);
  if (!data) throw new XbzError(412, "Credenciais XBZ não configuradas para esta empresa");
  if (!data.is_active) throw new XbzError(412, "Integração XBZ desativada para esta empresa");
  if (!data.portal_user_enc || !data.portal_password_enc) {
    throw new XbzError(412, "Credenciais XBZ incompletas (usuário/senha do portal)");
  }

  const [user, password] = await Promise.all([
    decryptSecret(data.portal_user_enc),
    decryptSecret(data.portal_password_enc),
  ]);

  return {
    row: {
      id: data.id,
      tenant_id: data.tenant_id,
      pessoa_id: data.pessoa_id,
      cnpj: data.cnpj,
      permissions: (data.permissions ?? {}) as Record<string, boolean>,
      is_active: data.is_active,
    },
    portal: { user, password },
  };
}

/** Garante que a flag de permissão do portal XBZ está habilitada para o cliente. */
export function requirePortalPermission(
  creds: ResolvedCredentials,
  flag: string,
): void {
  const perms = creds.row.permissions ?? {};
  // Se ainda não sincronizamos as flags (objeto vazio), não bloqueamos.
  if (Object.keys(perms).length === 0) return;
  if (perms[flag] !== true) {
    throw new XbzError(403, `A XBZ não autoriza esta operação para o cliente (${flag})`);
  }
}

/** Registra operações de escrita no carrinho para auditoria. */
export async function logCartOperation(
  admin: SupabaseClient,
  params: {
    tenantId: string;
    userId: string;
    action: string;
    payload: unknown;
    status?: number;
    success: boolean;
    error?: string;
  },
): Promise<void> {
  const { error } = await admin.from("xbz_carrinho_log").insert({
    tenant_id: params.tenantId,
    user_id: params.userId,
    action: params.action,
    payload: (params.payload ?? {}) as Record<string, unknown>,
    response_status: params.status ?? null,
    success: params.success,
    error_message: params.error ?? null,
  });
  if (error) console.error("[xbz] falha ao gravar auditoria de carrinho:", error.message);
}
