import { QueryClient, keepPreviousData } from "@tanstack/react-query";
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
 *
 * `placeholderData: keepPreviousData` makes paginated / filtered queries
 * keep showing the previous result while the new one is fetched, eliminating
 * the blank-flash that hurts perceived navigation fluidity.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME,
      gcTime: DEFAULT_GC_TIME,
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      placeholderData: keepPreviousData,
    },
  },
});


/**
 * Persister for React Query to sync cache with localStorage.
 * Used for offline support and faster subsequent loads.
 */
export const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'PROMO_SUPPLY_CACHE',
});
