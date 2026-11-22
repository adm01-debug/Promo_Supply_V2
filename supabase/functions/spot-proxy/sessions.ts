/**
 * Regras puras de seleção da sessão do portal SPOT.
 *
 * A tabela `spot_sessions` é compartilhada com a edge `spot-api`, que guarda ali
 * o token da API WS marcado com `metadata.tag = "spot-api-token"`. O portal
 * guarda o cookie PHPSESSID. A `spot-proxy` lia a tabela sem filtrar o tipo,
 * podia tratar o token da API como cookie de portal e, ao "limpar sessões
 * antigas", invalidava o token válido do `spot-api`.
 *
 * Separado do handler para poder testar sem Supabase (sessions_test.ts).
 */

export const PORTAL_SESSION_TAG = "spot-portal-cookie";
export const PORTAL_SESSION_TTL_MS = 30 * 60 * 1000;

export interface SpotSessionRow {
  id: string;
  session_cookie: string | null;
  is_valid: boolean | null;
  last_used_at: string | null;
  metadata: Record<string, unknown> | null;
}

export interface PortalSessionPick {
  /** Cookie reutilizável; `null` quando é preciso abrir o portal de novo. */
  cookie: string | null;
  /** Linha que deve ter `last_used_at` renovado. */
  reuseId: string | null;
  /** Linhas de portal válidas que devem virar `is_valid = false`. */
  invalidateIds: string[];
}

export function isPortalSession(row: SpotSessionRow): boolean {
  return row.metadata?.tag === PORTAL_SESSION_TAG;
}

/**
 * Escolhe a sessão de portal a usar, a partir das linhas já ordenadas por
 * `last_used_at` desc. Linhas de outro tipo (token da API WS) são ignoradas e
 * nunca entram em `invalidateIds`.
 */
export function pickPortalSession(
  rows: SpotSessionRow[],
  nowMs: number,
  ttlMs: number = PORTAL_SESSION_TTL_MS,
): PortalSessionPick {
  const portalRows = rows.filter(isPortalSession);
  if (portalRows.length === 0) {
    return { cookie: null, reuseId: null, invalidateIds: [] };
  }

  const [latest, ...stale] = portalRows;
  const invalidateIds = stale.map((row) => row.id);

  // `last_used_at` ausente ou inválido => tratar como expirado (fail-closed).
  const usedAt = latest.last_used_at ? new Date(latest.last_used_at).getTime() : NaN;
  const age = Number.isNaN(usedAt) ? Number.POSITIVE_INFINITY : nowMs - usedAt;

  if (latest.session_cookie && age < ttlMs) {
    return { cookie: latest.session_cookie, reuseId: latest.id, invalidateIds };
  }

  invalidateIds.push(latest.id);
  return { cookie: null, reuseId: null, invalidateIds };
}

/** O portal respondeu com redirect para o login => a sessão morreu. */
export function isLoginRedirect(location: string | null | undefined): boolean {
  if (!location) return false;
  return location.includes("login") || location.includes("area-reservada");
}
