import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface OfflineState {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnline: Date | null;
}

export function useOfflineDetection() {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    wasOffline: false,
    lastOnline: navigator.onLine ? new Date() : null,
  });

  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({
        isOnline: true,
        wasOffline: !prev.isOnline,
        lastOnline: new Date(),
      }));
      
      toast.success('Conexão restaurada!', {
        description: 'Sincronizando dados...',
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setState(prev => ({
        ...prev,
        isOnline: false,
      }));
      
      toast.warning('Você está offline', {
        description: 'Algumas funcionalidades podem estar limitadas.',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return state;
}

// Offline queue for mutations
interface QueuedMutation {
  id: string;
  key: string;
  data: unknown;
  timestamp: number;
  retries: number;
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedMutation[]>([]);
  const { isOnline } = useOfflineDetection();

  // Load queue from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('offline-queue');
    if (saved) {
      setQueue(JSON.parse(saved));
    }
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    localStorage.setItem('offline-queue', JSON.stringify(queue));
  }, [queue]);

  const addToQueue = useCallback((key: string, data: unknown) => {
    const mutation: QueuedMutation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      key,
      data,
      timestamp: Date.now(),
      retries: 0,
    };
    setQueue(prev => [...prev, mutation]);
    return mutation.id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(m => m.id !== id));
  }, []);

  const processQueue = useCallback(async (
    processor: (mutation: QueuedMutation) => Promise<boolean>
  ) => {
    if (!isOnline || queue.length === 0) return;

    const toProcess = [...queue];
    
    for (const mutation of toProcess) {
      try {
        const success = await processor(mutation);
        if (success) {
          removeFromQueue(mutation.id);
        } else {
          // Update retry count
          setQueue(prev => prev.map(m => 
            m.id === mutation.id 
              ? { ...m, retries: m.retries + 1 }
              : m
          ));
        }
      } catch (error) {
        console.error('Failed to process queued mutation:', error);
      }
    }
  }, [isOnline, queue, removeFromQueue]);

  return {
    queue,
    queueLength: queue.length,
    addToQueue,
    removeFromQueue,
    processQueue,
  };
}

// Hook for offline-first data
export function useOfflineData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number } = {}
) {
  const { ttl = 5 * 60 * 1000 } = options; // 5 minutes default
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isOnline } = useOfflineDetection();

  const cacheKey = `offline-cache-${key}`;

  // Load from cache
  useEffect(() => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data: cachedData, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > ttl;
      
      if (!isExpired || !isOnline) {
        setData(cachedData);
        setIsLoading(false);
        
        if (isExpired) {
          // Stale data, but we're offline
          toast.info('Mostrando dados em cache', {
            description: 'Os dados podem estar desatualizados.',
          });
        }
      }
    }
  }, [cacheKey, ttl, isOnline]);

  // Fetch fresh data
  useEffect(() => {
    if (!isOnline) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const freshData = await fetcher();
        setData(freshData);
        setError(null);
        
        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data: freshData,
          timestamp: Date.now(),
        }));
      } catch (err) {
        setError(err as Error);
        // Keep showing cached data if available
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOnline, fetcher, cacheKey]);

  const refresh = useCallback(async () => {
    if (!isOnline) {
      toast.error('Não é possível atualizar offline');
      return;
    }

    try {
      setIsLoading(true);
      const freshData = await fetcher();
      setData(freshData);
      localStorage.setItem(cacheKey, JSON.stringify({
        data: freshData,
        timestamp: Date.now(),
      }));
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, fetcher, cacheKey]);

  return { data, isLoading, error, refresh, isOnline };
}
