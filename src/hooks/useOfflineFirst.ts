import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// ============================================
// MELHORIA: Offline-First Architecture
// Arquitetura offline-first com sincronização
// ============================================

interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

interface OfflineFirstConfig {
  maxRetries?: number;
  retryDelay?: number;
  syncOnReconnect?: boolean;
  persistQueue?: boolean;
}

const SYNC_QUEUE_KEY = 'offline-sync-queue';
const CACHE_PREFIX = 'offline-cache-';

export const useOfflineFirst = (config: OfflineFirstConfig = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 5000,
    syncOnReconnect = true,
    persistQueue = true
  } = config;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  
  const queryClient = useQueryClient();
  const syncIntervalRef = useRef<NodeJS.Timeout>();

  // Load queue from localStorage on mount
  useEffect(() => {
    if (persistQueue) {
      const savedQueue = localStorage.getItem(SYNC_QUEUE_KEY);
      if (savedQueue) {
        try {
          setSyncQueue(JSON.parse(savedQueue));
        } catch (e) {
          console.error('Failed to parse sync queue:', e);
        }
      }
    }
  }, [persistQueue]);

  // Save queue to localStorage when it changes
  useEffect(() => {
    if (persistQueue) {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
    }
  }, [syncQueue, persistQueue]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (syncOnReconnect && syncQueue.length > 0) {
        processQueue();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue.length, syncOnReconnect]);

  // Add item to sync queue
  const addToQueue = useCallback((
    operation: SyncQueueItem['operation'],
    table: string,
    data: any
  ) => {
    const item: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      table,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries
    };

    setSyncQueue(prev => [...prev, item]);

    // Also update local cache optimistically
    updateLocalCache(operation, table, data);

    return item.id;
  }, [maxRetries]);

  // Update local cache
  const updateLocalCache = useCallback((
    operation: SyncQueueItem['operation'],
    table: string,
    data: any
  ) => {
    const cacheKey = `${CACHE_PREFIX}${table}`;
    const cached = localStorage.getItem(cacheKey);
    let items: any[] = cached ? JSON.parse(cached) : [];

    switch (operation) {
      case 'create':
        items = [...items, { ...data, _offline: true, _id: data.id || Date.now().toString() }];
        break;
      case 'update':
        items = items.map(item => 
          item.id === data.id ? { ...item, ...data, _offline: true } : item
        );
        break;
      case 'delete':
        items = items.filter(item => item.id !== data.id);
        break;
    }

    localStorage.setItem(cacheKey, JSON.stringify(items));
    
    // Invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: [table] });
  }, [queryClient]);

  // Process sync queue
  const processQueue = useCallback(async () => {
    if (!isOnline || isSyncing || syncQueue.length === 0) return;

    setIsSyncing(true);
    setSyncErrors([]);

    const errors: string[] = [];
    const processedIds: string[] = [];

    for (const item of syncQueue) {
      try {
        // Here you would call your actual API
        // This is a placeholder for the sync logic
        await syncItem(item);
        processedIds.push(item.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Sync failed';
        
        if (item.retries < item.maxRetries) {
          // Increment retry count
          setSyncQueue(prev => 
            prev.map(q => 
              q.id === item.id 
                ? { ...q, retries: q.retries + 1 }
                : q
            )
          );
        } else {
          errors.push(`Failed to sync ${item.operation} on ${item.table}: ${errorMessage}`);
          processedIds.push(item.id); // Remove from queue after max retries
        }
      }
    }

    // Remove processed items from queue
    setSyncQueue(prev => prev.filter(item => !processedIds.includes(item.id)));
    
    if (errors.length > 0) {
      setSyncErrors(errors);
    }

    setIsSyncing(false);
    setLastSyncTime(new Date());
  }, [isOnline, isSyncing, syncQueue]);

  // Sync individual item (placeholder - implement actual API calls)
  const syncItem = async (item: SyncQueueItem): Promise<void> => {
    // Simulate API call
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate for demo
          resolve(undefined);
        } else {
          reject(new Error('Network error'));
        }
      }, 500);
    });
  };

  // Get cached data
  const getCachedData = useCallback(<T>(table: string): T[] => {
    const cacheKey = `${CACHE_PREFIX}${table}`;
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : [];
  }, []);

  // Set cached data
  const setCachedData = useCallback(<T>(table: string, data: T[]) => {
    const cacheKey = `${CACHE_PREFIX}${table}`;
    localStorage.setItem(cacheKey, JSON.stringify(data));
  }, []);

  // Clear cache for a table
  const clearCache = useCallback((table?: string) => {
    if (table) {
      localStorage.removeItem(`${CACHE_PREFIX}${table}`);
    } else {
      // Clear all offline caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    }
  }, []);

  // Force sync
  const forceSync = useCallback(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  // Clear queue
  const clearQueue = useCallback(() => {
    setSyncQueue([]);
    localStorage.removeItem(SYNC_QUEUE_KEY);
  }, []);

  // Get pending operations count
  const pendingCount = syncQueue.length;

  // Check if there are pending changes for a specific record
  const hasPendingChanges = useCallback((table: string, id: string) => {
    return syncQueue.some(item => item.table === table && item.data?.id === id);
  }, [syncQueue]);

  return {
    isOnline,
    isSyncing,
    syncQueue,
    pendingCount,
    lastSyncTime,
    syncErrors,
    addToQueue,
    processQueue,
    forceSync,
    clearQueue,
    getCachedData,
    setCachedData,
    clearCache,
    hasPendingChanges
  };
};

// ============================================
// Offline-aware Query Hook
// ============================================

interface UseOfflineQueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T[]>;
  table: string;
  staleTime?: number;
}

export const useOfflineQuery = <T extends { id: string }>({
  queryKey,
  queryFn,
  table,
  staleTime = 5 * 60 * 1000 // 5 minutes
}: UseOfflineQueryOptions<T>) => {
  const { isOnline, getCachedData, setCachedData, hasPendingChanges } = useOfflineFirst();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
    const now = Date.now();
    const shouldFetch = isOnline && (now - lastFetchRef.current > staleTime);

    if (shouldFetch) {
      try {
        setIsLoading(true);
        const freshData = await queryFn();
        setData(freshData);
        setCachedData(table, freshData);
        lastFetchRef.current = now;
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch'));
        // Fall back to cached data
        const cached = getCachedData<T>(table);
        setData(cached);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Use cached data
      const cached = getCachedData<T>(table);
      setData(cached);
      setIsLoading(false);
    }
  }, [isOnline, queryFn, table, staleTime, getCachedData, setCachedData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline) {
      fetchData();
    }
  }, [isOnline, fetchData]);

  // Mark items with pending changes
  const dataWithStatus = data.map(item => ({
    ...item,
    _hasPendingChanges: hasPendingChanges(table, item.id)
  }));

  return {
    data: dataWithStatus,
    isLoading,
    error,
    refetch: fetchData,
    isOffline: !isOnline
  };
};

// ============================================
// Offline Mutation Hook
// ============================================

interface UseOfflineMutationOptions<T> {
  table: string;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export const useOfflineMutation = <T>({
  table,
  onSuccess,
  onError
}: UseOfflineMutationOptions<T>) => {
  const { isOnline, addToQueue } = useOfflineFirst();
  const [isLoading, setIsLoading] = useState(false);

  const create = useCallback(async (data: Partial<T>) => {
    setIsLoading(true);
    
    try {
      if (isOnline) {
        // Try to create directly
        // const result = await api.create(table, data);
        // onSuccess?.(result);
        // return result;
      }
      
      // Queue for later sync
      const id = addToQueue('create', table, data);
      onSuccess?.({ ...data, id } as T);
      return { ...data, id } as T;
    } catch (error) {
      // Queue for later sync on error
      addToQueue('create', table, data);
      if (error instanceof Error) {
        onError?.(error);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, table, addToQueue, onSuccess, onError]);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    setIsLoading(true);
    
    try {
      if (isOnline) {
        // Try to update directly
        // const result = await api.update(table, id, data);
        // onSuccess?.(result);
        // return result;
      }
      
      // Queue for later sync
      addToQueue('update', table, { id, ...data });
      onSuccess?.({ id, ...data } as T);
      return { id, ...data } as T;
    } catch (error) {
      addToQueue('update', table, { id, ...data });
      if (error instanceof Error) {
        onError?.(error);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, table, addToQueue, onSuccess, onError]);

  const remove = useCallback(async (id: string) => {
    setIsLoading(true);
    
    try {
      if (isOnline) {
        // Try to delete directly
        // await api.delete(table, id);
        // onSuccess?.();
      }
      
      // Queue for later sync
      addToQueue('delete', table, { id });
    } catch (error) {
      addToQueue('delete', table, { id });
      if (error instanceof Error) {
        onError?.(error);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, table, addToQueue, onError]);

  return {
    create,
    update,
    remove,
    isLoading,
    isOffline: !isOnline
  };
};

// ============================================
// Sync Status Component
// ============================================

export const useSyncStatus = () => {
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    lastSyncTime, 
    syncErrors,
    forceSync 
  } = useOfflineFirst();

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncErrors,
    forceSync,
    status: !isOnline 
      ? 'offline' 
      : isSyncing 
        ? 'syncing' 
        : pendingCount > 0 
          ? 'pending' 
          : 'synced'
  };
};

export default useOfflineFirst;
