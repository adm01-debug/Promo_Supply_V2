// Handler de push do service worker (PWA).
//
// Por que este arquivo existe: o vite.config.ts usa a estrategia `generateSW` do
// Workbox (vite-plugin-pwa), que gera um SW focado em cache/offline. Esse SW nao
// trata o evento `push`, entao `registration.pushManager` existe e a subscription
// e gravada em push_subscriptions, mas a mensagem enviada pela edge
// send-push-notification chegava ao navegador e nao virava notificacao quando a
// aba estava fechada. `workbox.importScripts` (vite.config.ts) concatena este
// arquivo ao SW gerado, sem trocar a estrategia e sem tocar no cache existente.
//
// Payload enviado pela edge (supabase/functions/send-push-notification/index.ts):
//   { title, body, icon, tag, data: { action_url, action_label, type, priority, ... } }

/* global clients */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Promo Supply', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Promo Supply';
  const priority = payload.data && payload.data.priority;

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.tag,
    // `requireInteraction` mantem a notificacao na tela ate acao do usuario nos
    // alertas criticos (SLA vencido, pagamento atrasado) — mesmo criterio que o
    // toast do hook usa para marcar `destructive`.
    requireInteraction: priority === 'critical',
    renotify: Boolean(payload.tag),
    data: payload.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(async () => {
      // Badge numerico do app instalado, quando o navegador suporta.
      if (typeof self.navigator?.setAppBadge !== 'function') return;
      const list = await self.registration.getNotifications();
      await self.navigator.setAppBadge(list.length);
    })
  );
});

// Clique na notificacao: foca uma aba ja aberta no destino ou abre uma nova.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.action_url) || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const wanted = new URL(targetUrl, self.location.origin);
          if (clientUrl.origin === wanted.origin && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
        return undefined;
      })
  );
});