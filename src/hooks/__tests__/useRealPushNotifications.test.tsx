import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regressão (etapa 288): o toast 'Notificações ativadas' era disparado ANTES e
 * independentemente de registerPushSubscription, que aborta em silêncio quando
 * falta VITE_VAPID_PUBLIC_KEY no build. O usuario recebia confirmacao de push
 * sem nenhuma subscription gravada em push_subscriptions.
 */

const toast = vi.fn();

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

vi.mock('@/features/auth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/realtime', () => ({
  abrirCanalPostgres: () => ({ on: () => ({ subscribe: () => ({}) }) }),
}));

function cadeia(resultado: unknown) {
  const handler: ProxyHandler<() => void> = {
    get: (_target, prop) => {
      if (prop === 'then') return (resolve: (valor: unknown) => void) => resolve(resultado);
      return cadeia(resultado);
    },
    apply: () => cadeia(resultado),
  };
  return new Proxy(() => {}, handler);
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => cadeia({ data: null, error: null }),
    removeChannel: vi.fn(),
  },
}));

import { useRealPushNotifications } from '../useRealPushNotifications';

const subscription = {
  endpoint: 'https://push.exemplo/ep',
  toJSON: () => ({ keys: { p256dh: 'p256dh', auth: 'auth' } }),
};

function mockarNavegador(getSubscription: unknown) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: () => Promise.resolve(getSubscription),
          subscribe: () => Promise.resolve(subscription),
        },
      }),
    },
  });

  vi.stubGlobal(
    'Notification',
    Object.assign(function NotificationStub() {}, {
      permission: 'default',
      requestPermission: () => Promise.resolve('granted'),
    }),
  );
}

describe('useRealPushNotifications — aviso honesto de push (etapa 288)', () => {
  beforeEach(() => {
    toast.mockReset();
    mockarNavegador(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sem VITE_VAPID_PUBLIC_KEY nao anuncia sucesso', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');

    const { result } = renderHook(() => useRealPushNotifications());

    await result.current.requestPermission();

    const titulos = toast.mock.calls.map((chamada) => (chamada[0] as { title: string }).title);
    expect(titulos).toContain('Push indisponível neste ambiente');
    expect(titulos).not.toContain('Notificações ativadas');
  });

  it('com a chave publica e inscricao existente anuncia sucesso', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'chave-publica-de-teste');
    mockarNavegador(subscription);

    const { result } = renderHook(() => useRealPushNotifications());

    await result.current.requestPermission();

    const titulos = toast.mock.calls.map((chamada) => (chamada[0] as { title: string }).title);
    expect(titulos).toContain('Notificações ativadas');
    expect(titulos).not.toContain('Push indisponível neste ambiente');
  });
});