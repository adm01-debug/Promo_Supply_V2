// deno-lint-ignore no-explicit-any
type Db = any;

/**
 * EDG-07: prioridades que merecem push. O resto continua so in-app.
 */
const PUSH_PRIORITIES = new Set(["high", "critical"]);

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
    // `profiles.id` é PK própria e só coincide com `auth.users.id` em parte dos
    // registros; a chave do usuário é `profiles.user_id`. Buscar pela PK errada
    // devolvia vazio e o alerta era descartado como "sem_tenant".
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", notif.user_id)
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
    if (error) return { ok: false, error };
    await maybeSendPush(supabase, notif, tenantId);
    return { ok: true };
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
    const { data: perfis } = await supabase.from("profiles").select("user_id, tenant_id").in("user_id", ids);
    for (const p of (perfis ?? []) as Array<{ user_id: string; tenant_id: string | null }>) {
      tenantsPorUsuario.set(p.user_id, p.tenant_id);
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

  /**
   * EDG-07: `send-push-notification` estava completa e sem chamador -- o front
   * gravava `push_subscriptions` e nada nunca enviava. Este e o fio: depois de a
   * notificacao in-app ser gravada com prioridade alta ou critica, o push sai para
   * o mesmo destinatario.
   *
   * Nunca lanca. Push e um canal secundario: falhar aqui nao pode derrubar a
   * operacao que originou a notificacao.
   */
  export async function maybeSendPush(
    supabase: Db,
    notif: NotificationTarget,
    tenantId: string,
  ): Promise<void> {
    try {
      // `sent_push` marca a notificacao criada pela propria edge de push; sem este
      // curto-circuito o fluxo push -> insertNotification -> push viraria laco.
      if (notif.sent_push) return;

      const prioridade = (notif.priority ?? "").toLowerCase();
      if (!PUSH_PRIORITIES.has(prioridade)) return;

      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("push_notifications")
        .eq("user_id", notif.user_id)
        .maybeSingle();
      if ((prefs as { push_notifications?: boolean } | null)?.push_notifications === false) return;

      // Sem inscricao ativa nao ha para quem enviar; evita uma chamada HTTP por
      // notificacao de usuario que nunca autorizou push.
      const { data: inscricoes } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", notif.user_id)
        .limit(1);
      if (!inscricoes || inscricoes.length === 0) return;

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const token = Deno.env.get("CRON_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !token) return;

      const resposta = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_ids: [notif.user_id],
          title: notif.title,
          message: notif.message,
          type: notif.type,
          priority: notif.priority,
          data: { ...(notif.data ?? {}), tenant_id: tenantId },
          action_url: notif.action_url,
          action_label: notif.action_label,
          // A notificacao in-app acabou de ser gravada por insertNotification;
          // deixar a edge gravar de novo duplicaria a linha na tela do usuario.
          skip_in_app: true,
        }),
      });
      if (!resposta.ok) {
        console.error("send-push-notification recusou o envio", resposta.status);
      }
    } catch (error) {
      console.error("Falha ao disparar push:", error instanceof Error ? error.message : error);
    }
  }