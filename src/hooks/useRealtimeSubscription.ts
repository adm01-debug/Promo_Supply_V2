import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

type TableName = 'solicitacoes' | 'pedidos' | 'cotacoes' | 'pagamentos' | 'notifications' | 'fornecedores' | 'contracts' | 'approval_workflows' | 'approval_steps';

interface RealtimeOptions {
  tables: TableName[];
  queryKeysToInvalidate?: string[][];
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
  enabled?: boolean;
  /** Debounce interval in ms (default 1000) to batch rapid changes */
  debounceMs?: number;
}

/**
 * Hook to subscribe to realtime changes on Supabase tables.
 * Debounces invalidations to prevent excessive re-renders from rapid DB changes.
 */
export function useRealtimeSubscription({
  tables,
  queryKeysToInvalidate,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
  debounceMs = 1000,
}: RealtimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingTablesRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushInvalidations = useCallback(() => {
    const tableNames = Array.from(pendingTablesRef.current);
    if (tableNames.length === 0) return;

    logger.debug('Realtime: flushing batch invalidations', { tables: tableNames });

    if (queryKeysToInvalidate) {
      queryKeysToInvalidate.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    } else {
      tableNames.forEach(table => {
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && key.includes(table);
          },
        });
      });
    }

    pendingTablesRef.current.clear();
  }, [queryClient, queryKeysToInvalidate]);

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    const channelName = `realtime-${tables.join('-')}`;
    let channel = supabase.channel(channelName);

    tables.forEach(table => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Queue table for batch invalidation
          pendingTablesRef.current.add(table);

          // Debounce: reset timer on each event
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(flushInvalidations, debounceMs);

          // Fire callbacks immediately
          if (payload.eventType === 'INSERT' && onInsert) onInsert(payload);
          if (payload.eventType === 'UPDATE' && onUpdate) onUpdate(payload);
          if (payload.eventType === 'DELETE' && onDelete) onDelete(payload);
        }
      );
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, tables.join(','), debounceMs]);
}
