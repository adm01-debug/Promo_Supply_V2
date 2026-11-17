// TTL da sessao PunchOut.
//
// A tabela punchout_sessions nao tem coluna expires_at (ver migration
// 20260513180103: id, tenant_id, catalog_id, user_id, buyer_cookie, return_url,
// status, raw_request_xml, raw_response_xml, cart_payload,
// created_solicitacao_id, created_at, closed_at). A idade da sessao e portanto
// derivada de created_at, para que um buyer_cookie vazado nao possa ser
// reenviado dias depois para injetar solicitacoes.
const DEFAULT_TTL_MINUTES = 1440;

export function getSessionTtlMinutes(): number {
  const raw = Number(Deno.env.get("PUNCHOUT_SESSION_TTL_MINUTES"));
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_MINUTES;
}

export function isPunchOutSessionExpired(
  createdAt: string | null | undefined,
  now: Date = new Date(),
  ttlMinutes: number = getSessionTtlMinutes(),
): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return now.getTime() - created > ttlMinutes * 60_000;
}
