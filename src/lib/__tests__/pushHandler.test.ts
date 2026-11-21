import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// O vite.config.ts usa a estrategia `generateSW` do Workbox, que NAO trata o evento
// `push`. Sem um handler acoplado ao SW gerado, o navegador assina a subscription
// (push_subscriptions tem linha) e a edge send-push-notification responde success,
// mas nenhuma notificacao aparece com a aba fechada — falha silenciosa.
// Este guard impede que o handler seja removido ou que o importScripts se perca.
const raiz = path.resolve(__dirname, '..', '..', '..');

const handler = readFileSync(path.join(raiz, 'public', 'push-handler.js'), 'utf8');
const viteConfig = readFileSync(path.join(raiz, 'vite.config.ts'), 'utf8');

describe('service worker de push', () => {
  it('registra listener do evento push', () => {
    expect(handler).toMatch(/addEventListener\(\s*['"]push['"]/);
  });

  it('exibe a notificacao com titulo vindo do payload da edge', () => {
    expect(handler).toMatch(/showNotification\(/);
    expect(handler).toMatch(/payload\.title/);
    expect(handler).toMatch(/payload\.body/);
  });

  it('abre a acao no clique e respeita action_url', () => {
    expect(handler).toMatch(/addEventListener\(\s*['"]notificationclick['"]/);
    expect(handler).toMatch(/action_url/);
    expect(handler).toMatch(/openWindow/);
  });

  it('esta acoplado ao SW gerado pelo Workbox via importScripts', () => {
    const workboxBlock = viteConfig.slice(viteConfig.indexOf('workbox:'));
    expect(workboxBlock).toContain("importScripts: ['push-handler.js']");
  });
});