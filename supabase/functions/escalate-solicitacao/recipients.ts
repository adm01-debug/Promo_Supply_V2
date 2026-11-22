/**
 * Resolucao de destinatarios do escalonamento. Extraida do handler da edge
 * para poder ser testada sem subir servidor HTTP.
 *
 * Regras (derivadas do schema real de prod):
 *  - gerencia  -> admin/coordinator do MESMO tenant da solicitacao
 *  - comprador -> comprador do pedido ligado a solicitacao; sem pedido ainda,
 *                 cai nos buyers do mesmo tenant
 *  - o proprio autor da acao nunca e notificado
 *  - sem `tenant_id` de referencia nao ha filtro confiavel por tenant; o alvo
 *    `comprador` entao nao amplia escopo (devolve vazio em vez de notificar
 *    todo mundo)
 */

// deno-lint-ignore no-explicit-any
export type AdminClient = any;

export type EscalationTarget = "gerencia" | "comprador";

export interface RecipientContext {
  target: EscalationTarget;
  solicitacaoId: string;
  tenantId: string | null;
  actorId: string;
}

/** Dias corridos desde a criacao, arredondando para cima, nunca negativo. */
export function diasDeEspera(createdAt: string, now: number = Date.now()): number {
  const ms = now - new Date(createdAt).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** Usuarios (ids) que devem receber a notificacao, sem duplicatas. */
export async function resolveRecipients(
  admin: AdminClient,
  ctx: RecipientContext,
): Promise<{ destinatarios: string[]; compradorResolvido: string | null }> {
  const destinatarios = new Set<string>();
  let compradorResolvido: string | null = null;

  if (ctx.target === "comprador") {
    const { data: pedido } = await admin
      .from("pedidos")
      .select("comprador_id")
      .eq("solicitacao_id", ctx.solicitacaoId)
      .not("comprador_id", "is", null)
      .limit(1)
      .maybeSingle();
    compradorResolvido = (pedido as { comprador_id?: string | null } | null)?.comprador_id ?? null;

    if (compradorResolvido) {
      if (compradorResolvido !== ctx.actorId) destinatarios.add(compradorResolvido);
    } else if (ctx.tenantId) {
      await collectByRole(admin, ["buyer"], ctx, destinatarios);
    }
  } else {
    await collectByRole(admin, ["admin", "coordinator"], ctx, destinatarios);
  }

  return { destinatarios: [...destinatarios], compradorResolvido };
}

async function collectByRole(
  admin: AdminClient,
  roles: string[],
  ctx: RecipientContext,
  out: Set<string>,
): Promise<void> {
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("user_id")
    .in("role", roles);
  const ids = ((roleRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
  if (ids.length === 0) return;

  const baseQuery = admin.from("profiles").select("user_id").in("user_id", ids);
  const { data: perfis } = ctx.tenantId
    ? await baseQuery.eq("tenant_id", ctx.tenantId)
    : await baseQuery;

  for (const p of (perfis ?? []) as Array<{ user_id: string }>) {
    if (p.user_id && p.user_id !== ctx.actorId) out.add(p.user_id);
  }
}

/** Texto exibido na notificacao, com override opcional do solicitante. */
export function buildMensagem(
  target: EscalationTarget,
  titulo: string,
  dias: number,
  override?: string | null,
): string {
  const custom = override?.trim();
  if (custom) return custom;
  return target === "gerencia"
    ? `A solicitacao "${titulo}" esta aberta ha ${dias} dia(s) e foi escalada para a gerencia.`
    : `A solicitacao "${titulo}" aguarda acao do comprador responsavel (${dias} dia(s) em aberto).`;
}

/** Assunto da notificacao. */
export function buildTitulo(target: EscalationTarget, referencia: string): string {
  return target === "gerencia"
    ? `Escalonamento: solicitacao #${referencia}`
    : `Acao necessaria: solicitacao #${referencia}`;
}