import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface RecentItem {
  id: string;
  type: 'solicitacao' | 'pedido' | 'fornecedor' | 'pagamento' | 'cotacao' | 'contrato' | 'page';
  title: string;
  subtitle?: string;
  url: string;
  icon?: string;
  viewedAt: string;
  metadata?: Record<string, unknown>;
}

interface UseRecentlyViewedOptions {
  maxItems?: number;
  storageKey?: string;
}

interface UseRecentlyViewedReturn {
  recentItems: RecentItem[];
  addRecentItem: (item: Omit<RecentItem, 'viewedAt'>) => void;
  removeRecentItem: (id: string) => void;
  clearRecentItems: () => void;
  getRecentByType: (type: RecentItem['type']) => RecentItem[];
  getMostRecent: (count?: number) => RecentItem[];
  isRecent: (id: string) => boolean;
  getRecentItemById: (id: string) => RecentItem | undefined;
}

const DEFAULT_MAX_ITEMS = 30;
const DEFAULT_STORAGE_KEY = 'recently_viewed';

/**
 * Hook para gerenciar itens visualizados recentemente
 * Persiste no localStorage e fornece métodos para gerenciar o histórico
 */
export function useRecentlyViewed(
  options: UseRecentlyViewedOptions = {}
): UseRecentlyViewedReturn {
  const { maxItems = DEFAULT_MAX_ITEMS, storageKey = DEFAULT_STORAGE_KEY } = options;

  // Initialize from localStorage
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentItem[];
        // Filter out old items (older than 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return parsed.filter(item => new Date(item.viewedAt) > thirtyDaysAgo);
      }
    } catch (error) {
      console.warn('Failed to load recently viewed items:', error);
    }
    return [];
  });

  // Persist to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(recentItems));
    } catch (error) {
      console.warn('Failed to save recently viewed items:', error);
    }
  }, [recentItems, storageKey]);

  // Add a new item to recent history
  const addRecentItem = useCallback((item: Omit<RecentItem, 'viewedAt'>) => {
    setRecentItems(prev => {
      // Remove existing item with same id (to move it to top)
      const filtered = prev.filter(i => i.id !== item.id);
      
      // Add new item at the beginning
      const newItem: RecentItem = {
        ...item,
        viewedAt: new Date().toISOString(),
      };
      
      // Limit to maxItems
      const updated = [newItem, ...filtered].slice(0, maxItems);
      
      return updated;
    });
  }, [maxItems]);

  // Remove a specific item
  const removeRecentItem = useCallback((id: string) => {
    setRecentItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Clear all recent items
  const clearRecentItems = useCallback(() => {
    setRecentItems([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Get recent items by type
  const getRecentByType = useCallback((type: RecentItem['type']) => {
    return recentItems.filter(item => item.type === type);
  }, [recentItems]);

  // Get most recent N items
  const getMostRecent = useCallback((count = 5) => {
    return recentItems.slice(0, count);
  }, [recentItems]);

  // Check if an item was recently viewed
  const isRecent = useCallback((id: string) => {
    return recentItems.some(item => item.id === id);
  }, [recentItems]);

  // Get a specific recent item by id
  const getRecentItemById = useCallback((id: string) => {
    return recentItems.find(item => item.id === id);
  }, [recentItems]);

  return {
    recentItems,
    addRecentItem,
    removeRecentItem,
    clearRecentItems,
    getRecentByType,
    getMostRecent,
    isRecent,
    getRecentItemById,
  };
}

// Type icons mapping for use in UI
export const recentItemTypeIcons: Record<RecentItem['type'], string> = {
  solicitacao: 'FileText',
  pedido: 'ShoppingCart',
  fornecedor: 'Building2',
  pagamento: 'CreditCard',
  cotacao: 'Calculator',
  contrato: 'FileSignature',
  page: 'Layout',
};

// Type labels for UI
export const recentItemTypeLabels: Record<RecentItem['type'], string> = {
  solicitacao: 'Solicitação',
  pedido: 'Pedido',
  fornecedor: 'Fornecedor',
  pagamento: 'Pagamento',
  cotacao: 'Cotação',
  contrato: 'Contrato',
  page: 'Página',
};

// Type colors for badges
export const recentItemTypeColors: Record<RecentItem['type'], string> = {
  solicitacao: 'bg-blue-500/10 text-blue-500',
  pedido: 'bg-green-500/10 text-green-500',
  fornecedor: 'bg-purple-500/10 text-purple-500',
  pagamento: 'bg-orange-500/10 text-orange-500',
  cotacao: 'bg-cyan-500/10 text-cyan-500',
  contrato: 'bg-pink-500/10 text-pink-500',
  page: 'bg-gray-500/10 text-gray-500',
};

/**
 * Helper hook to track page views automatically
 */
export function useTrackPageView(
  pageId: string,
  pageTitle: string,
  pageType: RecentItem['type'] = 'page'
) {
  const { addRecentItem } = useRecentlyViewed();

  useEffect(() => {
    addRecentItem({
      id: pageId,
      type: pageType,
      title: pageTitle,
      url: window.location.pathname,
    });
  }, [pageId, pageTitle, pageType, addRecentItem]);
}
