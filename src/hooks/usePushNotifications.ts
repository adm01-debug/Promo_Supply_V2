/**
 * Hook para Push Notifications
 * 
 * @module hooks/usePushNotifications
 * @description Gerencia push notifications usando Web Push API e PWA
 * 
 * Features:
 * - Solicitar permissão do usuário
 * - Registrar service worker
 * - Salvar subscription no servidor
 * - Enviar notificações de teste
 * - Desativar push notifications
 * 
 * @example
 * ```tsx
 * const {
 *   isSupported,
 *   permission,
 *   isSubscribed,
 *   requestPermission,
 *   subscribe,
 *   unsubscribe
 * } = usePushNotifications();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

export type PermissionState = 'default' | 'granted' | 'denied';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UsePushNotificationsReturn {
  /** Se push notifications são suportadas pelo navegador */
  isSupported: boolean;
  /** Estado da permissão */
  permission: PermissionState;
  /** Se o usuário está inscrito */
  isSubscribed: boolean;
  /** Estado de carregamento */
  isLoading: boolean;
  /** Erro se houver */
  error: Error | null;
  /** Solicitar permissão */
  requestPermission: () => Promise<PermissionState>;
  /** Inscrever-se em push notifications */
  subscribe: () => Promise<void>;
  /** Desinscrever-se */
  unsubscribe: () => Promise<void>;
  /** Enviar notificação de teste */
  sendTestNotification: () => Promise<void>;
}

// ============================================
// CONSTANTES
// ============================================

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// ============================================
// HOOK PRINCIPAL
// ============================================

export function usePushNotifications(): UsePushNotificationsReturn {
  const queryClient = useQueryClient();

  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ============================================
  // VERIFICAR SUPORTE E ESTADO INICIAL
  // ============================================

  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Verificar se Push API é suportada
        const supported = 'serviceWorker' in navigator && 
                         'PushManager' in window &&
                         'Notification' in window;

        setIsSupported(supported);

        if (!supported) {
          setIsLoading(false);
          return;
        }

        // Verificar permissão atual
        if ('Notification' in window) {
          setPermission(Notification.permission as PermissionState);
        }

        // Verificar se já está inscrito
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        setIsSubscribed(!!subscription);

        setIsLoading(false);
      } catch (err) {
        console.error('Erro ao verificar suporte:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    };

    checkSupport();
  }, []);

  // ============================================
  // QUERY - VERIFICAR SUBSCRIPTION NO SERVIDOR
  // ============================================

  const { data: serverSubscription } = useQuery({
    queryKey: ['push-subscription'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: isSupported && permission === 'granted',
  });

  // ============================================
  // SOLICITAR PERMISSÃO
  // ============================================

  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    try {
      if (!isSupported) {
        throw new Error('Push notifications não suportadas');
      }

      if (!('Notification' in window)) {
        throw new Error('API de Notificações não disponível');
      }

      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result === 'granted') {
        toast.success('Permissão concedida!');
      } else if (result === 'denied') {
        toast.error('Permissão negada');
      }

      return result as PermissionState;
    } catch (err) {
      console.error('Erro ao solicitar permissão:', err);
      const error = err as Error;
      setError(error);
      toast.error('Erro ao solicitar permissão');
      throw error;
    }
  }, [isSupported]);

  // ============================================
  // INSCREVER-SE
  // ============================================

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!isSupported) {
        throw new Error('Push notifications não suportadas');
      }

      // 1. Verificar/solicitar permissão
      let currentPermission = permission;
      if (currentPermission !== 'granted') {
        currentPermission = await requestPermission();
      }

      if (currentPermission !== 'granted') {
        throw new Error('Permissão necessária para push notifications');
      }

      // 2. Registrar service worker
      const registration = await navigator.serviceWorker.ready;

      // 3. Criar subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 4. Converter subscription para JSON
      const subscriptionJSON = subscription.toJSON();

      if (!subscriptionJSON.endpoint || !subscriptionJSON.keys) {
        throw new Error('Subscription inválida');
      }

      const pushData: PushSubscriptionData = {
        endpoint: subscriptionJSON.endpoint,
        keys: {
          p256dh: subscriptionJSON.keys.p256dh || '',
          auth: subscriptionJSON.keys.auth || '',
        },
      };

      // 5. Salvar no servidor
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: pushData,
          user_agent: navigator.userAgent,
          is_active: true,
          last_used_at: new Date().toISOString(),
        });

      if (error) throw error;

      setIsSubscribed(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      toast.success('Push notifications ativadas!');
    },
    onError: (error) => {
      console.error('Erro ao inscrever:', error);
      setError(error as Error);
      toast.error('Erro ao ativar push notifications');
    },
  });

  // ============================================
  // DESINSCREVER-SE
  // ============================================

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remover do servidor
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsSubscribed(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      toast.success('Push notifications desativadas');
    },
    onError: (error) => {
      console.error('Erro ao desinscrever:', error);
      setError(error as Error);
      toast.error('Erro ao desativar push notifications');
    },
  });

  // ============================================
  // NOTIFICAÇÃO DE TESTE
  // ============================================

  const sendTestNotificationMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-test-push', {
        body: {
          title: 'Teste de Push Notification',
          message: 'Se você recebeu isso, tudo está funcionando! 🎉',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Notificação de teste enviada!');
    },
    onError: (error) => {
      console.error('Erro ao enviar teste:', error);
      toast.error('Erro ao enviar notificação de teste');
    },
  });

  // ============================================
  // RETURN
  // ============================================

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe: subscribeMutation.mutate,
    unsubscribe: unsubscribeMutation.mutate,
    sendTestNotification: sendTestNotificationMutation.mutate,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// ============================================
// HOOKS AUXILIARES
// ============================================

/**
 * Hook simples para verificar apenas o status
 */
export function usePushStatus() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('default');

  useEffect(() => {
    const checkStatus = () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window &&
                       'Notification' in window;
      
      setIsSupported(supported);

      if (supported && 'Notification' in window) {
        setPermission(Notification.permission as PermissionState);
      }
    };

    checkStatus();

    // Atualizar quando a permissão mudar
    if ('Notification' in window) {
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  return { isSupported, permission, isEnabled: permission === 'granted' };
}

/**
 * Hook para mostrar badge com contador
 */
export function usePushBadge(count: number) {
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        (navigator as any).setAppBadge(count).catch(() => {
          // Ignorar se não suportado
        });
      } else {
        (navigator as any).clearAppBadge().catch(() => {
          // Ignorar
        });
      }
    }
  }, [count]);
}
