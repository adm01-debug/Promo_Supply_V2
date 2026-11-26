import { buildCorsHeaders, getTenantId } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";
import { insertNotification } from "../_shared/notifications.ts";

import { sendWebPush } from "./webpush.ts";
interface PushPayload {
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, unknown>;
  action_url?: string;
  action_label?: string;
  user_ids?: string[];
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

async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; tag?: string; data?: Record<string, unknown> },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const payloadString = JSON.stringify(payload);

    // VAPID (JWT ES256) + cifragem aes128gcm (RFC 8291). Sem esses headers o
    // push nao chega ao dispositivo — antes era um POST JSON sem Authorization.
    const success = await sendWebPush(
      { endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth },
      payloadString,
      { publicKey: vapidPublicKey, privateKey: vapidPrivateKey }
    );

    if (!success) {
      console.error(`Push failed for ${subscription.endpoint}`);
      return false;
    }

    console.log(`Push sent successfully to ${subscription.endpoint}`);
    return true;
  } catch (error) {
    console.error(`Error sending push to ${subscription.endpoint}:`, error);
    return false;
  }
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger('send-push-notification', requestId);

  try {
    // SECURITY: Validate user authentication
    const pushUserId = await verifyAuthUser(req);
    const rlPush = await checkRateLimit({ identifier: pushUserId, endpoint: "send-push-notification", maxRequests: 60, windowSeconds: 60 });
    if (!rlPush.allowed) return rateLimitedResponse(rlPush.retryAfterSeconds, cors);

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

    // QA-021 + INT-03: exige papel administrativo, mas tolerando mais de um papel.
        // `maybeSingle()` falhava com PGRST116 quando o usuario tinha 2+ papeis e
        // negava acesso legitimo de um admin que tambem e, por exemplo, comprador.
        const { data: roleRows, error: roleErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', pushUserId)
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
      .eq('user_id', pushUserId)
      .maybeSingle();
        let callerOrgId = profileRow?.current_organization_id ?? null;
        if (!callerOrgId) {
          // Nem todo usuario tem a organizacao no profile; o vinculo canonico nesse
          // caso esta em `user_tenants` (mesma regra do helper getTenantId).
          try {
            callerOrgId = await getTenantId(
              supabase as unknown as Parameters<typeof getTenantId>[0],
              { id: pushUserId } as unknown as Parameters<typeof getTenantId>[1],
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
        const membrosDoTenant = new Set<string>([
          ...(porProfile.data ?? []).map((p) => p.user_id as string),
          ...(porMembership.data ?? []).map((m) => m.user_id as string),
        ]);

    const body: PushPayload = await req.json();

    logger.info('Received push notification request');

    const { title, message, type, priority, data, action_url, action_label, user_ids } = body;

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
          logger.info('Tenant has no members to notify', { tenantId: callerOrgId });
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
    
    for (const userId of uniqueUserIds) {
      const { error: notifError } = await insertNotification(supabase, {
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

      if (notifError) {
        logger.error(`Error creating notification`, { userId, error: notifError });
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
    // loop. Now we remove a subscription immediately when its own send fails
    // — push endpoints don't recover mid-batch and Web Push spec says 404/410
    // means "gone" so it's safe to purge on first failure.
    for (const sub of subscriptions || []) {
      const success = await sendPushToSubscription(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        pushPayload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (success) {
        sentCount++;
      } else {
        failedCount++;
        const { error: delErr } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', sub.id);
        if (delErr) {
          logger.warn('Failed to purge invalid subscription', { id: sub.id, error: delErr });
        } else {
          logger.info('Removed invalid subscription', { id: sub.id });
        }
      }
    }

    logger.info(`Push notification completed`, { sentCount, failedCount });

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        notifications_created: uniqueUserIds.length,
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
