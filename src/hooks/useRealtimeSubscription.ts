import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 'solicitacoes' | 'pedidos' | 'cotacoes' | 'pagamentos' | 'notifications' | 'fornecedores' | 'contracts';

interface RealtimeOptions {
  tables: TableName[];
  queryKeysToInvalidate?: string[][];
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  enabled?: boolean;
}

/**
 * Hook to subscribe to realtime changes on Supabase tables.
 * Automatically invalidates related React Query cache keys.
 */
export function useRealtimeSubscription({
  tables,
  queryKeysToInvalidate,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: RealtimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    const channelName = `realtime-${tables.join('-')}-${Date.now()}`;
    let channel = supabase.channel(channelName);

    tables.forEach(table => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          // Invalidate query cache
          if (queryKeysToInvalidate) {
            queryKeysToInvalidate.forEach(key => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          } else {
            // Auto-invalidate based on table name
            queryClient.invalidateQueries({ 
              predicate: (query) => {
                const key = query.queryKey[0];
                return typeof key === 'string' && key.includes(table);
              }
            });
          }

          // Fire callbacks
          if (payload.eventType === 'INSERT' && onInsert) onInsert(payload);
          if (payload.eventType === 'UPDATE' && onUpdate) onUpdate(payload);
          if (payload.eventType === 'DELETE' && onDelete) onDelete(payload);
        }
      );
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, tables.join(',')]);
}
