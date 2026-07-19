import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/feedbackToast';
import { logger } from '@/lib/logger';
import type { ApprovalRule, ApprovalDelegation } from './approvalWorkflowTypes';

export const useApprovalRules = () => {
  const { user, organizationId } = useAuth();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [delegations, setDelegations] = useState<ApprovalDelegation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase
        .from('approval_rules').select('*')
        .eq('organization_id', organizationId)
        .order('prioridade', { ascending: false })
        .order('valor_min', { ascending: true });
      if (error) throw error;
      setRules((data || []).map(rule => ({
        ...rule,
        aprovadores: typeof rule.aprovadores === 'string'
          ? JSON.parse(rule.aprovadores)
          : rule.aprovadores || [],
      })) as ApprovalRule[]);
    } catch (error) { logger.error('Error fetching approval rules', { error }); }
  }, [organizationId]);

  const fetchDelegations = useCallback(async () => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase.from('approval_delegations').select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDelegations((data || []).map(d => ({
        ...d,
        categorias_permitidas: typeof d.categorias_permitidas === 'string'
          ? JSON.parse(d.categorias_permitidas)
          : d.categorias_permitidas || [],
      })) as ApprovalDelegation[]);
    } catch (error) { logger.error('Error fetching delegations', { error }); }
  }, [organizationId]);

  const saveRule = useCallback(async (rule: Partial<ApprovalRule>) => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const ruleData = {
        nome: rule.nome || '',
        descricao: rule.descricao,
        valor_min: rule.valor_min || 0,
        valor_max: rule.valor_max || 999999999,
        categoria_id: rule.categoria_id,
        cost_center_id: rule.cost_center_id,
        aprovadores: JSON.stringify(rule.aprovadores || []),
        tempo_limite_horas: rule.tempo_limite_horas || 24,
        escalacao_automatica: rule.escalacao_automatica || false,
        escalacao_para: rule.escalacao_para,
        niveis_aprovacao: rule.niveis_aprovacao || 1,
        requer_unanimidade: rule.requer_unanimidade || false,
        ativo: rule.ativo ?? true,
        prioridade: rule.prioridade || 0,
        created_by: user?.id,
        organization_id: organizationId,
      };
      if (rule.id) {
        const { error } = await supabase.from('approval_rules').update(ruleData).eq('id', rule.id);
        if (error) throw error;
        toast.success('Regra atualizada com sucesso');
      } else {
        const { error } = await supabase.from('approval_rules').insert(ruleData);
        if (error) throw error;
        toast.success('Regra criada com sucesso');
      }
      await fetchRules();
    } catch (error) { logger.error('Error saving rule', { error }); toast.error('Erro ao salvar regra'); }
    finally { setLoading(false); }
  }, [user, fetchRules, organizationId]);

  const deleteRule = useCallback(async (ruleId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('approval_rules').delete().eq('id', ruleId);
      if (error) throw error;
      toast.success('Regra excluída com sucesso');
      await fetchRules();
    } catch (error) { logger.error('Error deleting rule', { error }); toast.error('Erro ao excluir regra'); }
    finally { setLoading(false); }
  }, [fetchRules]);

  const saveDelegation = useCallback(async (delegation: Partial<ApprovalDelegation>) => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const delegationData = {
        delegante_id: delegation.delegante_id || '',
        delegado_id: delegation.delegado_id || '',
        data_inicio: delegation.data_inicio || new Date().toISOString(),
        data_fim: delegation.data_fim || '',
        motivo: delegation.motivo,
        categorias_permitidas: JSON.stringify(delegation.categorias_permitidas || []),
        valor_maximo: delegation.valor_maximo,
        ativo: delegation.ativo ?? true,
        organization_id: organizationId,
      };
      if (delegation.id) {
        const { error } = await supabase.from('approval_delegations').update(delegationData).eq('id', delegation.id);
        if (error) throw error;
        toast.success('Delegação atualizada com sucesso');
      } else {
        const { error } = await supabase.from('approval_delegations').insert(delegationData);
        if (error) throw error;
        toast.success('Delegação criada com sucesso');
      }
      await fetchDelegations();
    } catch (error) { logger.error('Error saving delegation', { error }); toast.error('Erro ao salvar delegação'); }
    finally { setLoading(false); }
  }, [fetchDelegations, organizationId]);

  const deleteDelegation = useCallback(async (delegationId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('approval_delegations').delete().eq('id', delegationId);
      if (error) throw error;
      toast.success('Delegação excluída com sucesso');
      await fetchDelegations();
    } catch (error) { logger.error('Error deleting delegation', { error }); toast.error('Erro ao excluir delegação'); }
    finally { setLoading(false); }
  }, [fetchDelegations]);

  const findApplicableRule = useCallback((valor: number, categoriaId?: string): ApprovalRule | null => {
    let rule = rules.find(r => r.ativo && valor >= r.valor_min && valor <= r.valor_max && r.categoria_id === categoriaId);
    if (!rule) rule = rules.find(r => r.ativo && valor >= r.valor_min && valor <= r.valor_max && !r.categoria_id);
    return rule || null;
  }, [rules]);

  const findApplicableRuleRPC = useCallback(async (valor: number, categoriaId?: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('find_approval_rule', {
        p_valor: valor,
        p_categoria_id: categoriaId || undefined,
      });
      if (error) throw error;
      return data as string | null;
    } catch (error) { logger.error('Error finding approval rule via RPC', { error }); return null; }
  }, []);

  const getEffectiveApprover = useCallback(async (approverId: string, categoriaId?: string, valor?: number) => {
    try {
      const { data, error } = await supabase.rpc('get_effective_approver', {
        p_approver_id: approverId,
        p_categoria_id: categoriaId || undefined,
        p_valor: valor || undefined,
      });
      if (error) throw error;
      return data as Array<{ approver_id: string; delegation_id: string | null }> | null;
    } catch (error) { logger.error('Error getting effective approver', { error }); return null; }
  }, []);

  return {
    rules, delegations, loading,
    fetchRules, fetchDelegations,
    saveRule, deleteRule, saveDelegation, deleteDelegation,
    findApplicableRule, findApplicableRuleRPC, getEffectiveApprover,
  };
};
