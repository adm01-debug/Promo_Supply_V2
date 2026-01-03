/**
 * Hook para Push Notifications
 */

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PermissionState = 'default' | 'granted' | 'denied';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: Error | null;
  requestPermission: () => Promise<PermissionState>;
  subscribe: () => void;
  unsubscribe: () => void;
  sendTestNotification: () => void;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const queryClient = useQueryClient();

  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported =
          'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

        setIsSupported(supported);

        if (!supported) {
          setIsLoading(false);
          return;
        }

        if ('Notification' in window) {
          setPermission(Notification.permission as PermissionState);
        }

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

  const { data: serverSubscription } = useQuery({
    queryKey: ['push-subscription'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isSupported && permission === 'granted',
  });

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

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!isSupported) {
        throw new Error('Push notifications não suportadas');
      }

      let currentPermission = permission;
      if (currentPermission !== 'granted') {
        currentPermission = await requestPermission();
      }

      if (currentPermission !== 'granted') {
        throw new Error('Permissão necessária para push notifications');
      }

      const registration = await navigator.serviceWorker.ready;

      const subscribeOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      };

      const subscription = await registration.pushManager.subscribe(subscribeOptions);
      const subscriptionJSON = subscription.toJSON();

      if (!subscriptionJSON.endpoint || !subscriptionJSON.keys) {
        throw new Error('Subscription inválida');
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscriptionJSON.endpoint,
        p256dh: subscriptionJSON.keys.p256dh || '',
        auth: subscriptionJSON.keys.auth || '',
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

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
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

export default usePushNotifications;
