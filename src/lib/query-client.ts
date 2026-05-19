import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/**
 * Standard stale time for most queries (30 seconds)
 */
export const DEFAULT_STALE_TIME = 30_000;

/**
 * Cache expiration (5 minutes)
 */
export const DEFAULT_GC_TIME = 5 * 60_000;

/**
 * React Query Client instance with global defaults.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME,
      gcTime: DEFAULT_GC_TIME,
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

/**
 * Persister for React Query to sync cache with localStorage.
 * Used for offline support and faster subsequent loads.
 */
export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'PROMO_SUPPLY_CACHE',
});
