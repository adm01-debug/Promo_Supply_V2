/**
 * Hook para sincronização offline
 * Gerencia o estado de conexão e sincronização de dados pendentes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
}

const STORAGE_KEY = 'offline_pending_operations';
const MAX_RETRIES = 3;

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
  });

  // Load pending operations from localStorage
  const getPendingOperations = useCallback((): PendingOperation[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save pending operations to localStorage
  const savePendingOperations = useCallback((operations: PendingOperation[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
      setState(prev => ({ ...prev, pendingCount: operations.length }));
    } catch (e) {
      console.error('Failed to save pending operations:', e);
    }
  }, []);

  // Add a pending operation
  const addPendingOperation = useCallback((
    type: PendingOperation['type'],
    table: string,
    data: Record<string, unknown>
  ) => {
    const operations = getPendingOperations();
    const newOperation: PendingOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      data,
      timestamp: Date.now(),
      retries: 0,
    };
    
    savePendingOperations([...operations, newOperation]);
    
    return newOperation.id;
  }, [getPendingOperations, savePendingOperations]);

  // Remove a pending operation
  const removePendingOperation = useCallback((id: string) => {
    const operations = getPendingOperations();
    savePendingOperations(operations.filter(op => op.id !== id));
  }, [getPendingOperations, savePendingOperations]);

  // Sync all pending operations
  const syncPendingOperations = useCallback(async () => {
    if (!state.isOnline || state.isSyncing) return;

    const operations = getPendingOperations();
    if (operations.length === 0) return;

    setState(prev => ({ ...prev, isSyncing: true }));

    const { supabase } = await import('@/integrations/supabase/client');
    const failedOperations: PendingOperation[] = [];

    for (const operation of operations) {
      try {
        let result;
        const tableName = operation.table as 'solicitacoes' | 'pedidos' | 'fornecedores' | 'pagamentos' | 'cotacoes' | 'contracts';
        
        switch (operation.type) {
          case 'create':
            result = await supabase
              .from(tableName)
              .insert(operation.data as never);
            break;
          case 'update':
            const { id: updateId, ...updateData } = operation.data;
            result = await supabase
              .from(tableName)
              .update(updateData as never)
              .eq('id', updateId as string);
            break;
          case 'delete':
            result = await supabase
              .from(tableName)
              .delete()
              .eq('id', operation.data.id as string);
            break;
        }

        if (result?.error) {
          throw result.error;
        }

        console.log(`✅ Synced operation: ${operation.type} on ${operation.table}`);
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        
        if (operation.retries < MAX_RETRIES) {
          failedOperations.push({
            ...operation,
            retries: operation.retries + 1,
          });
        } else {
          console.error(`Max retries reached for operation ${operation.id}, discarding`);
        }
      }
    }

    savePendingOperations(failedOperations);
    
    // Invalidate queries to refresh data
    await queryClient.invalidateQueries();

    setState(prev => ({
      ...prev,
      isSyncing: false,
      lastSyncAt: new Date(),
      pendingCount: failedOperations.length,
    }));
  }, [state.isOnline, state.isSyncing, getPendingOperations, savePendingOperations, queryClient]);

  // Handle online status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online - triggering sync');
      setState(prev => ({ ...prev, isOnline: true }));
      
      // Delay sync slightly to ensure connection is stable
      syncTimeoutRef.current = setTimeout(() => {
        syncPendingOperations();
      }, 1000);
    };

    const handleOffline = () => {
      console.log('📴 Gone offline');
      setState(prev => ({ ...prev, isOnline: false }));
      
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pending count
    const pending = getPendingOperations();
    setState(prev => ({ ...prev, pendingCount: pending.length }));

    // Sync on mount if online and has pending
    if (navigator.onLine && pending.length > 0) {
      syncTimeoutRef.current = setTimeout(syncPendingOperations, 2000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [getPendingOperations, syncPendingOperations]);

  // Wrapper for operations that can be queued offline
  const withOfflineSupport = useCallback(<T extends Record<string, unknown>>(
    table: string,
    type: PendingOperation['type'],
    operation: () => Promise<T>
  ): Promise<T | { offline: true; operationId: string }> => {
    return operation().catch((error) => {
      if (!state.isOnline || error.message?.includes('network')) {
        // Queue for later
        const operationId = addPendingOperation(type, table, error.data || {});
        return { offline: true, operationId };
      }
      throw error;
    });
  }, [state.isOnline, addPendingOperation]);

  return {
    ...state,
    addPendingOperation,
    removePendingOperation,
    syncPendingOperations,
    withOfflineSupport,
    hasPendingOperations: state.pendingCount > 0,
  };
}
