// deno-lint-ignore no-explicit-any
type Db = any;

/**
 * Alvo de notificação in-app. `tenant_id` é obrigatório na tabela `notifications`
 * (NOT NULL sem default) — sem ele o insert falha com 23502 e o alerta é perdido
 * silenciosamente. `tenant_id` pode vir da origem; quando não vem, é resolvido
 * pelo profile do destinatário.
 */
export interface NotificationTarget {
  user_id: string;
  tenant_id?: string | null;
  type: string;
  title: string;
  message: string;
  priority?: string;
  data?: Record<string, unknown>;
  action_url?: string;
  action_label?: string;
  sent_push?: boolean;
}

export interface NotificationResult {
  ok: boolean;
  skipped?: "sem_destinatario" | "sem_tenant" | "duplicada";
  error?: unknown;
}

/**
 * Insere uma notificação resolvendo o `tenant_id` ausente pelo profile do usuário.
 * Nunca lança: devolve `ok: false` para o chamador contabilizar a perda.
 */
export async function insertNotification(
  supabase: Db,
  notif: NotificationTarget,
  options: { dedupeSince?: string } = {},
): Promise<NotificationResult> {
  if (!notif.user_id) return { ok: false, skipped: "sem_destinatario" };

  let tenantId = notif.tenant_id ?? null;
  if (!tenantId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", notif.user_id)
      .maybeSingle();
    tenantId = (profile as { tenant_id?: string | null } | null)?.tenant_id ?? null;
  }
  if (!tenantId) return { ok: false, skipped: "sem_tenant" };

  if (options.dedupeSince) {
    const dedupe = supabase
      .from("notifications")
      .select("id")
      .eq("user_id", notif.user_id)
      .eq("title", notif.title)
      .gte("created_at", options.dedupeSince)
      .limit(1);
    const { data: existing } = await dedupe;
    if (existing && existing.length > 0) return { ok: false, skipped: "duplicada" };
  }

  const { error } = await supabase.from("notifications").insert({ ...notif, tenant_id: tenantId });
  return error ? { ok: false, error } : { ok: true };
}

/** Versão em lote: ignora destinos sem tenant para não derrubar o insert inteiro. */
export async function insertNotificationsBatch(
  supabase: Db,
  notifs: NotificationTarget[],
): Promise<{ inserted: number; skipped: number }> {
  const resolvidos: Array<NotificationTarget & { tenant_id: string }> = [];
  let skipped = 0;

  const semTenant = notifs.filter((n) => !n.tenant_id);
  const tenantsPorUsuario = new Map<string, string | null>();
  if (semTenant.length > 0) {
    const ids = [...new Set(semTenant.map((n) => n.user_id))];
    const { data: perfis } = await supabase.from("profiles").select("id, tenant_id").in("id", ids);
    for (const p of (perfis ?? []) as Array<{ id: string; tenant_id: string | null }>) {
      tenantsPorUsuario.set(p.id, p.tenant_id);
    }
  }

  for (const n of notifs) {
    const tenantId = n.tenant_id ?? tenantsPorUsuario.get(n.user_id) ?? null;
    if (!tenantId) {
      skipped++;
      continue;
    }
    resolvidos.push({ ...n, tenant_id: tenantId });
  }
  if (resolvidos.length === 0) return { inserted: 0, skipped };

  const { error } = await supabase.from("notifications").insert(resolvidos);
  return error ? { inserted: 0, skipped: skipped + resolvidos.length } : { inserted: resolvidos.length, skipped };
}