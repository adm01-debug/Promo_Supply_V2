import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface PerformanceReport {
  cost_center_id: string;
  cost_center_name: string;
  cost_center_code: string;
  total_budget: number;
  total_committed: number;
  total_used: number;
  available_balance: number;
  usage_percentage: number;
  alerts_count: number;
}

export const useBudgetManagement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['department-budgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_budgets')
        .select(`
          *,
          cost_center:cost_centers(name, code)
        `)
        .order('departamento', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: performanceReport = [], isLoading: loadingReport } = useQuery({
    queryKey: ['cost-center-performance'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cost_center_performance_report');
      if (error) throw error;
      return data as PerformanceReport[];
    },
  });

  const createBudget = useMutation({
    mutationFn: async (budget: {
      cost_center_id: string;
      centro_custo: string;
      departamento: string;
      ano: number;
      mes?: number | null;
      valor_total: number;
    }) => {
      const { error } = await supabase
        .from('department_budgets')
        .insert({
          ...budget,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-performance'] });
      toast.success('Orçamento criado com sucesso');
    },
    onError: (err: any) => {
      if (err.message?.includes('unique')) {
        toast.error('Já existe orçamento para este centro de custo/período');
      } else {
        toast.error('Erro ao criar orçamento');
      }
    },
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; valor_total?: number; valor_comprometido?: number; valor_utilizado?: number }) => {
      const { error } = await supabase
        .from('department_budgets')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-performance'] });
      toast.success('Orçamento atualizado');
    },
    onError: () => toast.error('Erro ao atualizar orçamento'),
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('department_budgets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-performance'] });
      toast.success('Orçamento removido');
    },
    onError: () => toast.error('Erro ao remover orçamento'),
  });

  const checkAvailability = async (costCenterId: string, valor: number) => {
    const { data, error } = await supabase.rpc('check_budget_availability', {
      p_cost_center_id: costCenterId,
      p_valor: valor,
    });
    if (error) throw error;
    return data as {
      available: boolean;
      has_budget: boolean;
      budget_total?: number;
      budget_available?: number;
      message: string;
    };
  };

  // Compute summary
  const summary = {
    totalBudget: budgets.reduce((s, b) => s + Number(b.valor_total), 0),
    totalCommitted: budgets.reduce((s, b) => s + Number(b.valor_comprometido), 0),
    totalUsed: budgets.reduce((s, b) => s + Number(b.valor_utilizado), 0),
    get available() { return this.totalBudget - this.totalCommitted - this.totalUsed; },
    get usagePercent() { return this.totalBudget > 0 ? ((this.totalCommitted + this.totalUsed) / this.totalBudget) * 100 : 0; },
  };

  return {
    budgets,
    performanceReport,
    loading: isLoading || loadingReport,
    createBudget,
    updateBudget,
    deleteBudget,
    checkAvailability,
    summary,
  };
};
