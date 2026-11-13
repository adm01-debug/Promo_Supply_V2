/**
 * Arquivos dos buckets privados (`documentos`, `comprovantes`).
 *
 * As policies de storage.objects exigem o caminho `{tenantId}/{userId}/...`, com o tenant
 * entre os do usuário (public.user_tenants). O tenant vem do cadastro (profiles.tenant_id):
 * o JWT não tem a claim `tenant_id`, então `tenantId` do useAuth costuma ser null.
 *
 * O banco guarda o caminho do objeto; para abrir, gera-se uma URL assinada. Registros
 * antigos guardaram a URL pública (`.../object/public/<bucket>/<caminho>`), que não abre em
 * bucket privado — os dois formatos são aceitos.
 */
import { supabase } from "@/integrations/supabase/client";

export type PrivateBucket = "documentos" | "comprovantes";

const SIGNED_URL_TTL_S = 60 * 60;

/** Tenant para o caminho de upload: o do contexto, senão profiles.tenant_id do usuário. */
export async function getStorageTenantId(userId: string, tenantId: string | null | undefined): Promise<string | null> {
  if (tenantId) return tenantId;
  const { data, error } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.tenant_id ?? null;
}

/** Caminho `{tenantId}/{userId}/...` aceito pelas policies de storage. */
export function privateStoragePath(tenantId: string, userId: string, ...rest: string[]): string {
  return [tenantId, userId, ...rest].join("/");
}

/**
 * Caminho do objeto a partir do valor salvo no banco: o próprio caminho (formato atual) ou a
 * URL do Storage deste bucket (formato antigo). URL de fora do Storage → null.
 */
export function storagePathFromStoredValue(bucket: PrivateBucket, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return v.replace(/^\/+/, "");
  let pathname: string;
  try {
    pathname = new URL(v).pathname;
  } catch {
    return null;
  }
  const m = pathname.match(/\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?([^/]+)\/(.+)$/);
  if (!m || m[1] !== bucket) return null;
  try {
    return decodeURIComponent(m[2]);
  } catch {
    return m[2];
  }
}

/** URL para abrir o arquivo: assinada quando é do bucket; URL externa volta como está. */
export async function resolveStoredFileUrl(bucket: PrivateBucket, value: string): Promise<string> {
  const path = storagePathFromStoredValue(bucket, value);
  if (!path) return value;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_S);
  if (error) throw error;
  return data.signedUrl;
}
