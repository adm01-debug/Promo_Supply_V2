/**
 * Hook para Filtros Salvos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
}

interface SaveFilterInput {
  name: string;
  filters: Record<string, unknown>;
  is_default?: boolean;
}

// Note: This hook uses a 'saved_filters' table that may need to be created
// For now, we'll use dashboard_filter_favorites table as a fallback
export function useSavedFilters(entityType: string) {
  const queryClient = useQueryClient();
  const queryKey = ['saved-filters', entityType];

  const { data: filters = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      // Use dashboard_filter_favorites as the table
      const { data, error } = await supabase
        .from('dashboard_filter_favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching filters:', error);
        return [];
      }

      // Map to SavedFilter format
      return (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        filters: {
          period: item.period_filter,
          supplier: item.supplier_filter,
          category: item.category_filter,
          showComparison: item.show_comparison,
        },
        is_default: item.is_default ?? false,
        created_at: item.created_at,
      })) as SavedFilter[];
    },
  });

  const defaultFilter = filters.find((f) => f.is_default);

  const saveMutation = useMutation({
    mutationFn: async (input: SaveFilterInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (input.is_default) {
        await supabase
          .from('dashboard_filter_favorites')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('dashboard_filter_favorites')
        .insert({
          user_id: user.id,
          name: input.name,
          period_filter: (input.filters.period as string) || null,
          supplier_filter: (input.filters.supplier as string) || null,
          category_filter: (input.filters.category as string) || null,
          show_comparison: (input.filters.showComparison as boolean) || null,
          is_default: input.is_default ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Filtro salvo com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar filtro: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: SaveFilterInput & { id: string }) => {
      const { error } = await supabase
        .from('dashboard_filter_favorites')
        .update({
          name: input.name,
          is_default: input.is_default,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Filtro atualizado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dashboard_filter_favorites').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Filtro removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      await supabase
        .from('dashboard_filter_favorites')
        .update({ is_default: false })
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('dashboard_filter_favorites')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Filtro padrão definido');
    },
  });

  return {
    filters,
    isLoading,
    defaultFilter,
    saveFilter: saveMutation.mutate,
    updateFilter: updateMutation.mutate,
    deleteFilter: deleteMutation.mutate,
    setDefault: setDefaultMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}

export default useSavedFilters;
