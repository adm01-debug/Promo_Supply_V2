import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PrefetchOptions {
  queryKey: string[];
  queryFn: () => Promise<unknown>;
  staleTime?: number;
  delay?: number;
}

export function usePrefetchOnHover({
  queryKey,
  queryFn,
  staleTime = 30000,
  delay = 100,
}: PrefetchOptions) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPrefetched = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (hasPrefetched.current) return;

    timeoutRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
      });
      hasPrefetched.current = true;
    }, delay);
  }, [queryClient, queryKey, queryFn, staleTime, delay]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleFocus = useCallback(() => {
    handleMouseEnter();
  }, [handleMouseEnter]);

  const handleBlur = useCallback(() => {
    handleMouseLeave();
  }, [handleMouseLeave]);

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
  };
}

// Link prefetch hook
export function useLinkPrefetch(
  to: string,
  fetchFn: () => Promise<unknown>,
  queryKey?: string[]
) {
  const queryClient = useQueryClient();
  const prefetched = useRef(false);

  const prefetch = useCallback(() => {
    if (prefetched.current) return;
    
    const key = queryKey || ['page', to];
    queryClient.prefetchQuery({
      queryKey: key,
      queryFn: fetchFn,
      staleTime: 60000,
    });
    prefetched.current = true;
  }, [queryClient, to, fetchFn, queryKey]);

  return {
    onMouseEnter: prefetch,
    onFocus: prefetch,
  };
}

// Batch prefetch for lists
export function useBatchPrefetch() {
  const queryClient = useQueryClient();
  const prefetchedIds = useRef(new Set<string>());

  const prefetchItem = useCallback(<T>(
    id: string,
    queryKey: string[],
    queryFn: () => Promise<T>
  ) => {
    if (prefetchedIds.current.has(id)) return;

    queryClient.prefetchQuery({
      queryKey: [...queryKey, id],
      queryFn,
      staleTime: 30000,
    });
    prefetchedIds.current.add(id);
  }, [queryClient]);

  const prefetchMultiple = useCallback(<T>(
    items: Array<{ id: string; queryKey: string[]; queryFn: () => Promise<T> }>
  ) => {
    items.forEach(({ id, queryKey, queryFn }) => {
      prefetchItem(id, queryKey, queryFn);
    });
  }, [prefetchItem]);

  return { prefetchItem, prefetchMultiple };
}
