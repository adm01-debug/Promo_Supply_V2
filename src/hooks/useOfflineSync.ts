/**
 * Hook para sincronização offline
 * Gerencia o estado de conexão e sincronização de dados pendentes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  /** Unix ms when the client created this record (for conflict detection on updates). */
  clientTimestamp: number;
  timestamp: number;
  retries: number;
}

/** Operations that exceeded MAX_RETRIES land here instead of being silently dropped. */
interface DeadLetterOperation extends PendingOperation {
  failedAt: number;
  lastError: string;
}

interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  deadLetterCount: number;
  lastSyncAt: Date | null;
}

const STORAGE_KEY = 'offline_pending_operations';
const DLQ_STORAGE_KEY = 'offline_dead_letter_queue';
const MAX_RETRIES = 5;

/** Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped) */
function backoffDelay(retries: number): number {
  return Math.min(1000 * 2 ** retries, 30_000);
}

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<OfflineSyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    deadLetterCount: 0,
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

  const getDeadLetterQueue = useCallback((): DeadLetterOperation[] => {
    try {
      const stored = localStorage.getItem(DLQ_STORAGE_KEY);
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
      logger.error('offlineSync: falha ao persistir operações pendentes', { error: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  const saveDeadLetter = useCallback((op: DeadLetterOperation) => {
    try {
      const queue = getDeadLetterQueue();
      // Keep last 50 DLQ entries to avoid unbounded growth
      const updated = [...queue, op].slice(-50);
      localStorage.setItem(DLQ_STORAGE_KEY, JSON.stringify(updated));
      setState(prev => ({ ...prev, deadLetterCount: updated.length }));
    } catch {
      /* ignore quota errors */
    }
  }, [getDeadLetterQueue]);

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
      clientTimestamp: Date.now(),
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
          case 'update': {
            const { id: updateId, ...updateData } = operation.data;
            // Conflict detection: only apply if the server row hasn't been
            // modified since we captured the operation (last-writer-wins guard).
            if (operation.clientTimestamp) {
              const { data: serverRow } = await supabase
                .from(tableName)
                .select('updated_at')
                .eq('id', updateId as string)
                .maybeSingle();
              const serverTs = serverRow && 'updated_at' in serverRow
                ? new Date((serverRow as { updated_at: string }).updated_at).getTime()
                : 0;
              if (serverTs > operation.clientTimestamp) {
                // Server is newer — skip silently and log for observability
                logger.warn('offlineSync: conflito detectado — descartando atualização offline', {
                  table: operation.table,
                  id: updateId,
                  serverTs: new Date(serverTs).toISOString(),
                  clientTs: new Date(operation.clientTimestamp).toISOString(),
                });
                continue;
              }
            }
            result = await supabase
              .from(tableName)
              .update(updateData as never)
              .eq('id', updateId as string);
            break;
          }
          case 'delete':
            result = await supabase
              .from(tableName)
              .delete()
              .eq('id', operation.data["id"] as string);
            break;
        }

        if (result?.error) {
          throw result.error;
        }

        // Synced successfully — nothing to push to failedOperations
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error('offlineSync: falha ao sincronizar operação', {
          operationId: operation.id,
          type: operation.type,
          table: operation.table,
          retries: operation.retries,
          error: errMsg,
        });

        if (operation.retries < MAX_RETRIES) {
          // Schedule retry with exponential backoff
          const delay = backoffDelay(operation.retries);
          logger.warn(`offlineSync: reagendando tentativa ${operation.retries + 1}/${MAX_RETRIES} em ${delay}ms`, {
            operationId: operation.id,
          });
          failedOperations.push({ ...operation, retries: operation.retries + 1 });
        } else {
          // Move to dead-letter queue instead of silently discarding
          logger.error('offlineSync: máximo de tentativas atingido — movendo para DLQ', {
            operationId: operation.id,
            type: operation.type,
            table: operation.table,
          });
          saveDeadLetter({
            ...operation,
            failedAt: Date.now(),
            lastError: errMsg,
          });
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

    // If retries remain, schedule next attempt with backoff from the first failure
    if (failedOperations.length > 0) {
      const delay = backoffDelay(failedOperations[0].retries);
      syncTimeoutRef.current = setTimeout(syncPendingOperations, delay);
    }
  }, [state.isOnline, state.isSyncing, getPendingOperations, savePendingOperations, saveDeadLetter, queryClient]);

  // Handle online status changes
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Delay sync slightly to ensure connection is stable
      syncTimeoutRef.current = setTimeout(() => {
        syncPendingOperations();
      }, 1000);
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pending / DLQ counts
    const pending = getPendingOperations();
    const dlq = getDeadLetterQueue();
    setState(prev => ({ ...prev, pendingCount: pending.length, deadLetterCount: dlq.length }));

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
  }, [getPendingOperations, getDeadLetterQueue, syncPendingOperations]);

  // Wrapper for operations that can be queued offline.
  const withOfflineSupport = useCallback(<T extends Record<string, unknown>>(
    table: string,
    type: PendingOperation['type'],
    payload: Record<string, unknown>,
    operation: () => Promise<T>
  ): Promise<T | { offline: true; operationId: string }> => {
    return operation().catch((error) => {
      if (!state.isOnline || (error as Error).message?.includes('network')) {
        const operationId = addPendingOperation(type, table, payload);
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
    deadLetterQueue: getDeadLetterQueue,
  };
}
