import { useCallback, useMemo, useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { toast } from 'sonner';
import { auditHelpers } from '@/services/auditService';
import { useApprovalWorkflow } from '@/hooks/useApprovalWorkflow';
import { fetchAllRows } from '@/lib/paginatedFetch';
import type { Json, Database } from '@/integrations/supabase/types';
import { CreateSolicitacaoSchema, type CreateSolicitacaoInput } from '@/features/solicitacoes';

export type CostCenter = Database['public']['Tables']['cost_centers']['Row'] & {
  manager?: { full_name: string | null } | null;
};

export type Solicitacao = Database['public']['Tables']['solicitacoes']['Row'] & {
  fornecedor?: { razao_social: string; nome_fantasia: string | null; } | null;
  categoria?: { nome: string; } | null;
  organization?: { name: string; } | null;
  cost_center?: { name: string; code: string; } | null;
};

// Using types from schema
export type { CreateSolicitacaoInput };

export interface SolicitacaoFilters {
  search?: string;
  status?: string;
  tipo?: string;
  prioridade?: string;
  dateFrom?: string;
  dateTo?: string;
  valorMin?: number;
  valorMax?: number;
  page?: number;
  pageSize?: number;
}

const VALID_SOLICITACAO_TRANSITIONS: Record<string, string[]> = {
  pendente: ['em_cotacao', 'aprovada', 'rejeitada', 'cancelada'],
  em_cotacao: ['aprovada', 'rejeitada', 'cancelada'],
  aprovada: ['em_andamento', 'cancelada'],
  em_andamento: ['concluida', 'cancelada'],
  rejeitada: ['pendente'],
  concluida: [],
  cancelada: [],
};

async function fetchSolicitacoesData(userId: string | undefined, tenantId: string | null | undefined, filters?: SolicitacaoFilters) {
  if (!userId || !tenantId) return { data: [], totalCount: 0 };

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 100;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('solicitacoes')
    .select(`
      *,
      fornecedor:fornecedores(razao_social, nome_fantasia),
      categoria:categorias(nome),
      cost_center:cost_centers(name, code),
      aprovador:profiles!solicitacoes_aprovador_id_fkey(full_name),
      solicitante:profiles!solicitacoes_solicitante_id_fkey(full_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .eq('organization_id', tenantId)
    .range(from, to);

  if (filters?.status && filters.status !== 'todas') query = query.eq('status', filters.status);
  if (filters?.tipo && filters.tipo !== 'todos') query = query.eq('tipo', filters.tipo);
  if (filters?.prioridade && filters.prioridade !== 'todas') query = query.eq('prioridade', filters.prioridade);
  if (filters?.search) query = query.or(`titulo.ilike.%${filters.search}%,numero.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%`);
  if (filters?.dateFrom) query = query.gte('data_necessidade', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('data_necessidade', filters.dateTo);
  if (filters?.valorMin !== undefined) query = query.gte('valor_estimado', filters.valorMin);
  if (filters?.valorMax !== undefined) query = query.lte('valor_estimado', filters.valorMax);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Solicitacao[]) || [], totalCount: count || 0 };
}

export function useSolicitacoes(filters?: SolicitacaoFilters) {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { createWorkflow } = useApprovalWorkflow();

  const queryKey = useMemo(() => [
    'solicitacoes', user?.id, tenantId,
    filters?.status, filters?.tipo, filters?.prioridade, filters?.search,
    filters?.dateFrom, filters?.dateTo, filters?.valorMin, filters?.valorMax,
    filters?.page, filters?.pageSize,
  ], [user?.id, tenantId, filters]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchSolicitacoesData(user?.id, tenantId, filters),
    enabled: !!user && !!tenantId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const solicitacoes = data?.data || [];
  const totalCount = data?.totalCount || 0;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
  }, [queryClient]);

  const createSolicitacao = useCallback(async (input: CreateSolicitacaoInput) => {
    if (!user || !tenantId) { toast.error('Você precisa estar logado em uma organização'); return null; }
    
    const validated = CreateSolicitacaoSchema.safeParse(input);
    if (!validated.success) {
      const errorMsg = validated.error.errors[0]?.message || 'Dados inválidos';
      toast.error(errorMsg);
      return null;
    }

    try {
      logger.info('Criando nova solicitação', { titulo: input.titulo, tipo: input.tipo });

      // Validação de orçamento
      if (input.cost_center_id && input.valor_estimado) {
        const { data: availability, error: budgetError } = await supabase.rpc('check_budget_availability', {
          p_cost_center_id: input.cost_center_id,
          p_valor: input.valor_estimado
        });
        
        if (budgetError) {
          logger.error('Erro ao verificar orçamento', { error: budgetError, costCenterId: input.cost_center_id });
        } else if (availability && !(availability as any).available) {
          logger.warn('Saldo insuficiente no centro de custo', { 
            costCenterId: input.cost_center_id, 
            valor: input.valor_estimado 
          });
          toast.error((availability as any).message || 'Saldo insuficiente no centro de custo.');
          if (input.prioridade !== 'urgente') {
            return null;
          }
          toast.info('Solicitação urgente: ignorando restrição orçamentária temporariamente.');
        }
      }

      const { data: numData } = await supabase.rpc('generate_sequential_number', { prefix: 'SOL', table_name: 'solicitacoes' });
      const numero = numData || `SOL-${Date.now()}`;
      
      const { data: solData, error: solError } = await supabase
        .from('solicitacoes')
        .insert({
          numero, 
          titulo: validated.data.titulo, 
          descricao: validated.data.descricao, 
          tipo: validated.data.tipo as any, // Database enum type
          prioridade: validated.data.prioridade as any,
          valor_estimado: validated.data.valor_estimado,
          quantidade: validated.data.quantidade, 
          unidade: validated.data.unidade,
          data_necessidade: validated.data.data_necessidade, 
          departamento: validated.data.departamento,
          centro_custo: validated.data.centro_custo, 
          cost_center_id: validated.data.cost_center_id,
          justificativa: validated.data.justificativa,
          categoria_id: validated.data.categoria_id, 
          solicitante_id: user.id,
          tenant_id: tenantId,
        })
        .select().single();
      
      if (solError) {
        logger.error('Erro ao inserir solicitação no banco', { error: solError });
        throw solError;
      }

      // Iniciar Workflow de Aprovação se houver valor ou centro de custo
      if (solData && (input.valor_estimado || input.cost_center_id)) {
        await createWorkflow(solData.id, input.valor_estimado || 0, input.categoria_id || undefined);
        
        // Audit Log
        await auditHelpers.logCreate(
          'solicitacao', 
          solData.id, 
          `Solicitação ${solData.numero} criada por ${user.email}`,
          solData
        );
      }

      logger.info('Solicitação criada com sucesso', { id: solData?.id, numero: solData?.numero });
      toast.success('Solicitação criada e enviada para aprovação!');
      invalidate();
      return solData;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao criar solicitação', { error: msg });
      toast.error('Erro ao criar solicitação: ' + msg);
      return null;
    }
  }, [user, tenantId, invalidate, createWorkflow]);

  const updateSolicitacao = useCallback(async (id: string, updates: Partial<Solicitacao>) => {
    try {
      const { error } = await supabase.from('solicitacoes').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Solicitação atualizada!');
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar: ' + msg);
      return false;
    }
  }, [invalidate]);

  const updateStatus = useCallback(async (id: string, newStatus: Solicitacao['status']) => {
    const sol = solicitacoes.find(s => s.id === id);
    if (sol) {
      const allowed = VALID_SOLICITACAO_TRANSITIONS[sol.status];
      if (allowed && !allowed.includes(newStatus)) {
        toast.error(`Transição inválida: ${sol.status} → ${newStatus}`);
        return false;
      }
    }
    return updateSolicitacao(id, { status: newStatus });
  }, [solicitacoes, updateSolicitacao]);

  const deleteSolicitacao = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('solicitacoes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Solicitação excluída!');
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao excluir: ' + msg);
      return false;
    }
  }, [invalidate]);

  const bulkDelete = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase.from('solicitacoes').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} solicitação(ões) excluída(s)!`);
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao excluir: ' + msg);
      return false;
    }
  }, [invalidate]);

  const bulkUpdateStatus = useCallback(async (ids: string[], newStatus: Solicitacao['status']) => {
    try {
      const { error } = await supabase.from('solicitacoes').update({ status: newStatus }).in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} solicitação(ões) atualizada(s)!`);
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar: ' + msg);
      return false;
    }
  }, [invalidate]);

  const duplicateSolicitacao = useCallback(async (id: string) => {
    const original = solicitacoes.find(s => s.id === id);
    if (!original) { toast.error('Solicitação não encontrada'); return null; }
    return createSolicitacao({
      titulo: `${original.titulo} (Cópia)`,
      descricao: original.descricao || undefined,
      tipo: original.tipo,
      prioridade: original.prioridade as any,
      valor_estimado: original.valor_estimado || undefined,
      quantidade: original.quantidade,
      unidade: original.unidade || 'un',
      departamento: original.departamento || undefined,
      centro_custo: original.centro_custo || undefined,
      justificativa: original.justificativa || undefined,
      categoria_id: original.categoria_id || undefined,
    });
  }, [solicitacoes, createSolicitacao]);

  const { data: costCenters = [], isLoading: loadingCostCenters } = useQuery({
    queryKey: ['cost-centers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_centers')
        .select(`
          *,
          manager:profiles(full_name)
        `)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as CostCenter[];
    },
    staleTime: 300_000,
  });

  return {
    solicitacoes, totalCount, loading: isLoading, error: error?.message || null,
    costCenters, loadingCostCenters,
    refetch, createSolicitacao, updateSolicitacao, updateStatus,
    deleteSolicitacao, bulkDelete, bulkUpdateStatus, duplicateSolicitacao,
  };
}

// Hook for KPIs optimized with RPC
export function useSolicitacoesKPIs() {
  const { user, tenantId } = useAuth();
  
  const { data: kpis = { total: 0, pendentes: 0, emCotacao: 0, aprovadas: 0, concluidas: 0, valorTotal: 0 }, isLoading } = useQuery({
    queryKey: ['solicitacoes-kpis', user?.id, tenantId],
    queryFn: async () => {
      if (!tenantId) return { total: 0, pendentes: 0, emCotacao: 0, aprovadas: 0, concluidas: 0, valorTotal: 0 };
      
      const { data, error } = await supabase.rpc('get_solicitacoes_kpis', { 
        p_organization_id: tenantId 
      });
      
      if (error) {
        logger.error('Error fetching Solicitacoes KPIs via RPC', { error });
        throw error;
      }

      return data as {
        total: number;
        pendentes: number;
        emCotacao: number;
        aprovadas: number;
        concluidas: number;
        valorTotal: number;
      };
    },
    enabled: !!user && !!tenantId,
    staleTime: 60_000,
  });

  return { kpis, loading: isLoading };
}