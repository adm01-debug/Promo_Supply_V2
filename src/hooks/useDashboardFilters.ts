import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface DashboardFilter {
  id: string;
  name: string;
  category_filter: string | null;
  supplier_filter: string | null;
  period_filter: string | null;
  show_comparison: boolean | null;
  is_default: boolean | null;
  created_at: string;
}

export interface FilterValues {
  category: string;
  supplier: string;
  period: string;
  showComparison: boolean;
}

export const useDashboardFilters = () => {
  const { user, tenantId } = useAuth();
  const [favorites, setFavorites] = useState<DashboardFilter[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user || !tenantId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dashboard_filter_favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveFavorite = async (name: string, filters: FilterValues) => {
    if (!user || !organizationId) {
      toast.error('Você precisa estar logado em uma organização para salvar filtros');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('dashboard_filter_favorites')
        .insert({
          user_id: user.id,
          name,
          category_filter: filters.category,
          supplier_filter: filters.supplier,
          period_filter: filters.period,
          show_comparison: filters.showComparison,
          is_default: false,
          organization_id: organizationId
        })
        .select()
        .single();

      if (error) throw error;
      
      setFavorites(prev => [data, ...prev]);
      toast.success(`Filtro "${name}" salvo com sucesso`);
      return data;
    } catch (error) {
      console.error('Error saving favorite:', error);
      toast.error('Erro ao salvar filtro favorito');
      return null;
    }
  };

  const deleteFavorite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dashboard_filter_favorites')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setFavorites(prev => prev.filter(f => f.id !== id));
      toast.success('Filtro removido com sucesso');
    } catch (error) {
      console.error('Error deleting favorite:', error);
      toast.error('Erro ao remover filtro');
    }
  };

  const setAsDefault = async (id: string) => {
    if (!user) return;

    try {
      // First, unset all defaults
      await supabase
        .from('dashboard_filter_favorites')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Then set the new default
      const { error } = await supabase
        .from('dashboard_filter_favorites')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      
      setFavorites(prev => prev.map(f => ({
        ...f,
        is_default: f.id === id
      })));
      toast.success('Filtro definido como padrão');
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Erro ao definir filtro padrão');
    }
  };

  const getDefaultFilter = useCallback((): DashboardFilter | null => {
    return favorites.find(f => f.is_default) || null;
  }, [favorites]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return {
    favorites,
    loading,
    saveFavorite,
    deleteFavorite,
    setAsDefault,
    getDefaultFilter,
    refetch: fetchFavorites
  };
};
