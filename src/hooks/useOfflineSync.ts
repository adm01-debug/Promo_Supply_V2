import { useState, useEffect, useCallback } from 'react';

interface SyncItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'offline_sync_queue';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load sync queue from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    if (stored) {
      try {
        setSyncQueue(JSON.parse(stored));
      } catch {
        setSyncQueue([]);
      }
    }
  }, []);

  // Save sync queue to localStorage
  useEffect(() => {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
  }, [syncQueue]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add item to sync queue (for offline mutations)
  const addToSyncQueue = useCallback((item: Omit<SyncItem, 'id' | 'timestamp'>) => {
    const newItem: SyncItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setSyncQueue(prev => [...prev, newItem]);
    return newItem.id;
  }, []);

  // Remove item from sync queue
  const removeFromSyncQueue = useCallback((id: string) => {
    setSyncQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  // Clear entire sync queue
  const clearSyncQueue = useCallback(() => {
    setSyncQueue([]);
    localStorage.removeItem(SYNC_QUEUE_KEY);
  }, []);

  // Process sync queue when online
  const processSyncQueue = useCallback(async () => {
    if (!isOnline || syncQueue.length === 0 || isSyncing) return;

    setIsSyncing(true);
    const processedIds: string[] = [];

    for (const item of syncQueue) {
      try {
        // Here you would make the actual API call to Supabase
        // For now, we'll simulate success
        console.log('Syncing item:', item);
        processedIds.push(item.id);
      } catch (error) {
        console.error('Failed to sync item:', item, error);
        // Keep failed items in queue for retry
      }
    }

    // Remove successfully processed items
    setSyncQueue(prev => prev.filter(item => !processedIds.includes(item.id)));
    setIsSyncing(false);
  }, [isOnline, syncQueue, isSyncing]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      processSyncQueue();
    }
  }, [isOnline, syncQueue.length, processSyncQueue]);

  return {
    isOnline,
    syncQueue,
    pendingCount: syncQueue.length,
    isSyncing,
    addToSyncQueue,
    removeFromSyncQueue,
    clearSyncQueue,
    processSyncQueue,
  };
}
