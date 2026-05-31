import { useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/feedbackToast';

export interface SpotProduct {
  id: string;
  ref: string;
  name: string;
  image?: string;
  slug?: string;
  price?: number;
  stock?: number;
  stockActual?: number;
  step?: number;
  colors?: Array<{ id: string; name: string; hex: string }>;
}

export interface SpotCartItem {
  groupId: string;
  ref: string;
  unitPrice: number;
  stockAvailable: number;
  quantity?: number;
  name?: string;
}

export interface SpotOrder {
  id: string;
  status: string;
  statusColor: string;
  reference: string;
  date: string;
  total: number;
  detailsUrl: string;
  tracking: string;
  carrier: string;
}

export interface SpotFinancialDoc {
  docNumber: string;
  orderNumber: string;
  date: string;
  dueDate: string;
  amount: string;
  status: string;
  downloadUrl: string | null;
  isOverdue: boolean;
}

async function callSpotProxy(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('spot-proxy', {
    body: { action, ...params },
  });

  if (error) {
    const msg = error.message || 'Erro na comunicação com SPOT';
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useSpotIntegration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    if (loadingRef.current) return null; // Prevent concurrent requests
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
      toast.error('Erro SPOT: ' + msg);
      return null;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const searchProducts = useCallback(async (query: string) => {
    return withLoading(async () => {
      const data = await callSpotProxy('search', { query: query.trim() });
      return (data?.search || []) as Array<{ line: number; value: string; text: string }>;
    });
  }, [withLoading]);

  const browseCatalog = useCallback(async (filters: Record<string, string> = {}) => {
    return withLoading(async () => {
      const data = await callSpotProxy('catalog', { filters });
      return data as { products: SpotProduct[]; total: number };
    });
  }, [withLoading]);

  const getProduct = useCallback(async (productId: string) => {
    return withLoading(async () => {
      const data = await callSpotProxy('product', { productId });
      return data as SpotProduct;
    });
  }, [withLoading]);

  const checkStock = useCallback(async (productId: string, quantity: number, opcionais: string[] = []) => {
    return withLoading(async () => {
      const data = await callSpotProxy('stock', {
        productId,
        quantity,
        opcionais,
      });
      return data as { data: { status: string; label: string }; _status: { success: boolean } };
    });
  }, [withLoading]);

  const addToCart = useCallback(async (productId: string, quantity: number, opcional0: string, opcional1 = '0') => {
    return withLoading(async () => {
      const data = await callSpotProxy('addToCart', {
        productId,
        quantity,
        opcional0,
        opcional1,
      });
      toast.success('Produto adicionado ao carrinho SPOT!');
      return data;
    });
  }, [withLoading]);

  const getCart = useCallback(async () => {
    return withLoading(async () => {
      const data = await callSpotProxy('getCart');
      return data as { items: SpotCartItem[]; total: number; hash: string | null; itemCount: number };
    });
  }, [withLoading]);

  const removeFromCart = useCallback(async (groupId: string) => {
    return withLoading(async () => {
      const data = await callSpotProxy('removeFromCart', { groupId });
      toast.success('Item removido do carrinho');
      return data;
    });
  }, [withLoading]);

  const updateCartQuantity = useCallback(async (groupId: string, quantity: number) => {
    return withLoading(async () => {
      return await callSpotProxy('updateCartQty', { groupId, quantity });
    });
  }, [withLoading]);

  const getOrders = useCallback(async (year?: string, page?: string) => {
    return withLoading(async () => {
      const data = await callSpotProxy('orders', { year, page });
      return data as { orders: SpotOrder[]; totalPages: number };
    });
  }, [withLoading]);

  const getFinancialDocs = useCallback(async () => {
    return withLoading(async () => {
      const data = await callSpotProxy('financial');
      return data as { documents: SpotFinancialDoc[]; hasOverdue: boolean; total: number };
    });
  }, [withLoading]);

  const getCheckoutInfo = useCallback(async (addressId?: string) => {
    return withLoading(async () => {
      return await callSpotProxy('checkout', { addressId });
    });
  }, [withLoading]);

  const testConnection = useCallback(async () => {
    return withLoading(async () => {
      const data = await callSpotProxy('login');
      if (data?.success) toast.success('Conexão SPOT estabelecida!');
      return data;
    });
  }, [withLoading]);

  // Return a stable object reference using useMemo
  return useMemo(() => ({
    loading,
    error,
    searchProducts,
    browseCatalog,
    getProduct,
    checkStock,
    addToCart,
    getCart,
    removeFromCart,
    updateCartQuantity,
    getOrders,
    getFinancialDocs,
    getCheckoutInfo,
    testConnection,
  }), [
    loading, error, searchProducts, browseCatalog, getProduct,
    checkStock, addToCart, getCart, removeFromCart, updateCartQuantity,
    getOrders, getFinancialDocs, getCheckoutInfo, testConnection,
  ]);
}
