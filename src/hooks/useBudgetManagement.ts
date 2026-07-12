import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/feedbackToast';
import { useAuth } from '@/features/auth';
import { logger } from '@/lib/logger';

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
  const { user, organizationId } = useAuth();

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['department-budgets', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('department_budgets')
        .select(`
          *,
          cost_center:cost_centers(name, code)
        `)
        .eq('organization_id', organizationId)
        .order('departamento', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: performanceReport = [], isLoading: loadingReport } = useQuery({
    queryKey: ['cost-center-performance', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
       
      const { data, error } = await (supabase.rpc as any)('get_cost_center_performance_report', {
        p_organization_id: organizationId
      });
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
      logger.info('Criando novo orçamento departamental', { costCenterId: budget.cost_center_id, valor: budget.valor_total });
      const { error } = await supabase
        .from('department_budgets')
        .insert({
          ...budget,
          created_by: user?.id,
          organization_id: organizationId,
        });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      logger.info('Orçamento criado com sucesso', { costCenterId: variables.cost_center_id });
      queryClient.invalidateQueries({ queryKey: ['department-budgets', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-performance', organizationId] });
      toast.success('Orçamento criado com sucesso');
    },
    onError: (err: any, variables) => {
      logger.error('Erro ao criar orçamento', { error: err.message, costCenterId: variables.cost_center_id });
      if (err.message?.includes('unique')) {
        toast.error('Já existe orçamento para este centro de custo/período');
      } else {
        toast.error('Erro ao criar orçamento');
      }
    },
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; valor_total?: number; valor_comprometido?: number; valor_utilizado?: number }) => {
      logger.info('Atualizando orçamento', { id, updates });
      const { error } = await supabase
        .from('department_budgets')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      logger.info('Orçamento atualizado com sucesso', { id: variables.id });
      queryClient.invalidateQueries({ queryKey: ['department-budgets', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-performance', organizationId] });
      toast.success('Orçamento atualizado');
    },
    onError: (err: any, variables) => {
      logger.error('Erro ao atualizar orçamento', { error: err.message, id: variables.id });
      toast.error('Erro ao atualizar orçamento');
    },
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
      queryClient.invalidateQueries({ queryKey: ['department-budgets', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-performance', organizationId] });
      toast.success('Orçamento removido');
    },
    onError: () => toast.error('Erro ao remover orçamento'),
  });

  const checkAvailability = async (costCenterId: string, valor: number) => {
    logger.debug('Verificando disponibilidade orçamentária', { costCenterId, valor });
    const { data, error } = await supabase.rpc('check_budget_availability', {
      p_cost_center_id: costCenterId,
      p_valor: valor,
    });
    if (error) {
      logger.error('Erro ao verificar disponibilidade orçamentária', { error, costCenterId });
      throw error;
    }
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
