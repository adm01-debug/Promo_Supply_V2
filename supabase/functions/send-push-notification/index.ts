import { buildCorsHeaders, getTenantId, verifyCronSecret } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";
import { insertNotification } from "../_shared/notifications.ts";

import { sendPushToSubscription, isSubscriptionGone, type WebPushResult } from "./webpush.ts";
interface PushPayload {
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, unknown>;
  action_url?: string;
  action_label?: string;
  user_ids?: string[];
    /** EDG-07: chamada interna -- a notificacao in-app ja existe, nao gravar de novo. */
    skip_in_app?: boolean;
}

async function verifyAuthUser(req: Request): Promise<string> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Não autorizado: token ausente");
  }
  const token = authHeader.slice(7).trim();
  if (!token) throw new Error("Não autorizado: token inválido");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Não autorizado: token inválido");
  return user.id;
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger('send-push-notification', requestId);

  try {
    // EDG-07: a edge tambem e chamada pelo caminho interno (`_shared/notifications.ts`
        // depois de gravar uma notificacao HIGH/CRITICAL). Nesse caminho nao existe JWT de
        // usuario -- o token e o CRON_SECRET/service role -- e a autorizacao e o `user_ids`
        // explicito: chamada interna sem destinatario e recusada, para nunca virar broadcast.
        const body: PushPayload = await req.json();
        const chamadaInterna = verifyCronSecret(req) === null;
        if (chamadaInterna && (!body.user_ids || body.user_ids.length === 0)) {
          return new Response(
            JSON.stringify({ error: 'Bad Request: internal calls must name user_ids' }),
            { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        // SECURITY: Validate user authentication
        const pushUserId = chamadaInterna ? null : await verifyAuthUser(req);
        if (pushUserId) {
          const rlPush = await checkRateLimit({ identifier: pushUserId, endpoint: "send-push-notification", maxRequests: 60, windowSeconds: 60 });
          if (!rlPush.allowed) return rateLimitedResponse(rlPush.retryAfterSeconds, cors);
        }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      logger.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // EDG-07: na chamada interna o escopo ja veio do destinatario da notificacao; nao
    // ha papel nem tenant de chamador para conferir (`pushUserId` e null). O bloco
    // abaixo so roda na chamada do front, com JWT de usuario.
    let membrosDoTenant: Set<string>;
    if (chamadaInterna) {
      membrosDoTenant = new Set<string>(body.user_ids ?? []);
    } else {
    const callerId = pushUserId as string;

    // QA-021 + INT-03: exige papel administrativo, mas tolerando mais de um papel.
        // `maybeSingle()` falhava com PGRST116 quando o usuario tinha 2+ papeis e
        // negava acesso legitimo de um admin que tambem e, por exemplo, comprador.
        const { data: roleRows, error: roleErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
                .in('role', ['admin', 'coordinator']);
        if (roleErr) {
          logger.error('Role check failed', { error: roleErr });
          return new Response(
            JSON.stringify({ error: 'Role check failed' }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }
        if (!roleRows || roleRows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: admin or coordinator role required to send push notifications' }),
        { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // QA-021 / INT-03: o tenant do chamador e o unico escopo aceito. Antes,
        // quando o profile nao tinha `current_organization_id`, o filtro era pulado
        // e a consulta saia sem `user_id` nenhum - broadcast para TODOS os tenants.
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('user_id', callerId)
      .maybeSingle();
        let callerOrgId = profileRow?.current_organization_id ?? null;
        if (!callerOrgId) {
          // Nem todo usuario tem a organizacao no profile; o vinculo canonico nesse
          // caso esta em `user_tenants` (mesma regra do helper getTenantId).
          try {
            callerOrgId = await getTenantId(
              supabase as unknown as Parameters<typeof getTenantId>[0],
              { id: callerId } as unknown as Parameters<typeof getTenantId>[1],
            );
          } catch {
            callerOrgId = null;
          }
        }
        if (!callerOrgId) {
          return new Response(
            JSON.stringify({ error: 'Forbidden: caller has no organization scope' }),
            { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        // Destinatarios possiveis: membros do tenant do chamador, pelas duas fontes
        // de vinculo que o sistema usa (profiles.current_organization_id e user_tenants).
        const [porProfile, porMembership] = await Promise.all([
          supabase.from('profiles').select('user_id').eq('current_organization_id', callerOrgId),
          supabase.from('user_tenants').select('user_id').eq('tenant_id', callerOrgId),
        ]);
        if (porProfile.error) throw porProfile.error;
        if (porMembership.error) throw porMembership.error;
        membrosDoTenant = new Set<string>([
          ...(porProfile.data ?? []).map((p) => p.user_id as string),
          ...(porMembership.data ?? []).map((m) => m.user_id as string),
        ]);
            }

    logger.info('Received push notification request');

    const { title, message, type, priority, data, action_url, action_label, user_ids, skip_in_app } = body;

        // QA-021: se o chamador escolheu destinatarios, todos tem de ser do seu tenant.
        if (user_ids && user_ids.length > 0) {
          const outsiders = user_ids.filter((id) => !membrosDoTenant.has(id));
      if (outsiders.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: cannot send push to users outside your organization' }),
          { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }
    }

        if (membrosDoTenant.size === 0) {
          // Tenant sem membro: nao ha destinatario. Sem este curto-circuito a
          // consulta sairia sem filtro e voltaria a ser global.
          logger.info('Tenant has no members to notify', { tenantId: chamadaInterna ? null : pushUserId });
          return new Response(
            JSON.stringify({ success: true, sent: 0, failed: 0, notifications_created: 0 }),
            { headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

    let query = supabase.from('push_subscriptions').select('*');

    if (user_ids && user_ids.length > 0) {
      query = query.in('user_id', user_ids);
        } else {
          // QA-021: sem destinatarios explicitos, o alvo e o tenant do chamador.
          query = query.in('user_id', [...membrosDoTenant]);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      logger.error('Error fetching subscriptions', { error: subError });
      throw subError;
    }

    logger.info(`Found subscriptions to notify`, { count: subscriptions?.length || 0 });

    const uniqueUserIds = [...new Set((subscriptions || []).map(s => s.user_id))];
    
    // EDG-07: na chamada interna a notificacao in-app ja existe -- foi ela que
    // disparou o push --, entao gravar de novo duplicaria a linha na tela.
    if (!skip_in_app) {
    for (const userId of uniqueUserIds) {
      const notifRes = await insertNotification(supabase, {
        user_id: userId,
        type,
        title,
        message,
        priority,
        data: data || {},
        action_url,
        action_label,
        sent_push: true,
      });

      if (!notifRes.ok) {
        logger.warn(`Notification not created`, {
          userId,
          skipped: notifRes.skipped,
          error: notifRes.error,
        });
      }
    }
              }

    const pushPayload = {
      title,
      body: message,
      icon: '/pwa-192x192.png',
      tag: `${type}-${Date.now()}`,
      data: {
        ...data,
        action_url,
        action_label,
        type,
        priority,
      },
    };

    let sentCount = 0;
    let failedCount = 0;

    // HIGH-C7: track failures per-subscription. The previous global counter
    // deleted the wrong endpoint whenever any 3 sends failed anywhere in the
    // loop. INT-04: o `false` do envio também colapsava "endpoint morto" com
    // "provedor instável", e a purga rodava nas duas situações — uma
    // indisponibilidade de terceiro apagava a inscrição de vez. Agora só 404/410
    // (RFC 8030 §5: a inscrição não existe mais) purgam; o resto preserva.
    for (const sub of subscriptions || []) {
      const resultado = await sendPushToSubscription(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        pushPayload,
        { publicKey: vapidPublicKey, privateKey: vapidPrivateKey }
      );

      if (resultado.ok) {
        sentCount++;
        continue;
      }

      failedCount++;

      if (!isSubscriptionGone(resultado.status)) {
        logger.warn('Push indisponivel; inscricao preservada', {
          id: sub.id,
          status: resultado.status,
        });
        continue;
      }

      const { error: delErr } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', sub.id);
      if (delErr) {
        logger.warn('Failed to purge invalid subscription', { id: sub.id, error: delErr });
      } else {
        logger.info('Removed invalid subscription', { id: sub.id, status: resultado.status });
      }
    }

    logger.info(`Push notification completed`, { sentCount, failedCount });

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        notifications_created: skip_in_app ? 0 : uniqueUserIds.length,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (typeof logger !== 'undefined') {
      logger.error('Error in send-push-notification', { error: errorMessage });
    } else {
      console.error('Error in send-push-notification:', error);
    }
    const status = errorMessage.includes("Não autorizado") ? 401 : 500;
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
