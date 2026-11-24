/**
 * Decisao do gate de credencial do SCIM (QA-047 / EDGA-07).
 *
 * Extraido de index.ts para ser testavel sem rede: o gate antigo so tinha
 * teste de integracao, que se auto-desliga quando SCIM_TEST_BASE_URL nao
 * esta definido - entao a suite passava sem executar nada.
 *
 * Duas fontes de credencial, em ALTERNATIVA (nao em sequencia):
 *   1. hash por empresa em sso_configurations.scim_token_hash
 *   2. segredo global legado SCIM_BEARER_TOKEN
 * Fail-closed (503) quando nenhuma das duas existe.
 */

import { timingSafeEqualStr } from "../_shared/security.ts";

export type ScimGateDecision =
  | { ok: true; via: "tenant-hash" | "global-token" }
  | { ok: false; status: 401 | 503; error: string };

const encoder = new TextEncoder();

/** QA 065: a comparacao em tempo constante vive em `_shared/security.ts`. */
export { timingSafeEqualStr as timingSafeEqual };

/**
 * Decide se a requisicao pode prosseguir.
 *
 * @param token Bearer recebido (ja sem o prefixo).
 * @param tokenHash sha256 hex do token recebido.
 * @param tenantHashes hashes ativos de sso_configurations (pode ser vazio).
 * @param globalToken valor de SCIM_BEARER_TOKEN (undefined se ausente).
 */
export function evaluateScimGate(
  token: string,
  tokenHash: string,
  tenantHashes: readonly unknown[],
  globalToken: string | undefined,
): ScimGateDecision {
  const viaTenant = tenantHashes.some(
    (h) => typeof h === "string" && h.length > 0 && timingSafeEqualStr(h, tokenHash),
  );
  if (viaTenant) return { ok: true, via: "tenant-hash" };

  const viaGlobal = typeof globalToken === "string" && globalToken.length > 0
    && timingSafeEqualStr(token, globalToken);
  if (viaGlobal) return { ok: true, via: "global-token" };

  // Sem nenhuma fonte configurada -> 503 (operador precisa configurar).
  // Com fonte configurada mas token errado -> 401 (cliente errado).
  const algumaFonteConfigurada = (globalToken !== undefined && globalToken.length > 0)
    || tenantHashes.some((h) => typeof h === "string" && h.length > 0);
  if (!algumaFonteConfigurada) {
    return { ok: false, status: 503, error: "SCIM not configured" };
  }
  return { ok: false, status: 401, error: "Unauthorized" };
}

/** sha256 em hex, igual ao usado para gravar scim_token_hash. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
