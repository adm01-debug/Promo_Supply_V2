import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  ApprovalRule, ApprovalDelegation, ApprovalWorkflow,
  ApprovalStep, ApprovalHistory,
} from './approvalWorkflowTypes';

export type { ApprovalRule, ApprovalDelegation, ApprovalWorkflow, ApprovalStep, ApprovalHistory };

export const useApprovalWorkflow = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [delegations, setDelegations] = useState<ApprovalDelegation[]>([]);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [pendingSteps, setPendingSteps] = useState<ApprovalStep[]>([]);
  const [allHistory, setAllHistory] = useState<ApprovalHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('approval_rules').select('*')
        .order('prioridade', { ascending: false })
        .order('valor_min', { ascending: true });
      if (error) throw error;
      setRules((data || []).map(rule => ({
        ...rule,
        aprovadores: typeof rule.aprovadores === 'string' ? JSON.parse(rule.aprovadores) : rule.aprovadores || []
      })) as ApprovalRule[]);
    } catch (error) { console.error('Error fetching approval rules:', error); }
  }, []);

  const fetchDelegations = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('approval_delegations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setDelegations((data || []).map(d => ({
        ...d,
        categorias_permitidas: typeof d.categorias_permitidas === 'string' ? JSON.parse(d.categorias_permitidas) : d.categorias_permitidas || []
      })) as ApprovalDelegation[]);
    } catch (error) { console.error('Error fetching delegations:', error); }
  }, []);

  const fetchPendingWorkflows = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('approval_workflows').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      if (error) throw error;
      setWorkflows((data || []) as ApprovalWorkflow[]);
    } catch (error) { console.error('Error fetching workflows:', error); }
  }, [user]);

  const fetchPendingSteps = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('approval_steps').select('*').eq('status', 'pending')
        .or(`aprovador_id.eq.${user.id},aprovador_efetivo_id.eq.${user.id}`)
        .order('prazo_limite', { ascending: true });
      if (error) throw error;
      setPendingSteps((data || []) as ApprovalStep[]);
    } catch (error) { console.error('Error fetching pending steps:', error); }
  }, [user]);

  const saveRule = useCallback(async (rule: Partial<ApprovalRule>) => {
    try {
      setLoading(true);
      const ruleData = {
        nome: rule.nome || '', descricao: rule.descricao, valor_min: rule.valor_min || 0,
        valor_max: rule.valor_max || 999999999, categoria_id: rule.categoria_id,
        aprovadores: JSON.stringify(rule.aprovadores || []),
        tempo_limite_horas: rule.tempo_limite_horas || 24,
        escalacao_automatica: rule.escalacao_automatica || false, escalacao_para: rule.escalacao_para,
        niveis_aprovacao: rule.niveis_aprovacao || 1, requer_unanimidade: rule.requer_unanimidade || false,
        ativo: rule.ativo ?? true, prioridade: rule.prioridade || 0, created_by: user?.id
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
    } catch (error) { console.error('Error saving rule:', error); toast.error('Erro ao salvar regra'); }
    finally { setLoading(false); }
  }, [user, fetchRules]);

  const deleteRule = useCallback(async (ruleId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('approval_rules').delete().eq('id', ruleId);
      if (error) throw error;
      toast.success('Regra excluída com sucesso');
      await fetchRules();
    } catch (error) { console.error('Error deleting rule:', error); toast.error('Erro ao excluir regra'); }
    finally { setLoading(false); }
  }, [fetchRules]);

  const saveDelegation = useCallback(async (delegation: Partial<ApprovalDelegation>) => {
    try {
      setLoading(true);
      const delegationData = {
        delegante_id: delegation.delegante_id || '', delegado_id: delegation.delegado_id || '',
        data_inicio: delegation.data_inicio || new Date().toISOString(), data_fim: delegation.data_fim || '',
        motivo: delegation.motivo, categorias_permitidas: JSON.stringify(delegation.categorias_permitidas || []),
        valor_maximo: delegation.valor_maximo, ativo: delegation.ativo ?? true
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
    } catch (error) { console.error('Error saving delegation:', error); toast.error('Erro ao salvar delegação'); }
    finally { setLoading(false); }
  }, [fetchDelegations]);

  const deleteDelegation = useCallback(async (delegationId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('approval_delegations').delete().eq('id', delegationId);
      if (error) throw error;
      toast.success('Delegação excluída com sucesso');
      await fetchDelegations();
    } catch (error) { console.error('Error deleting delegation:', error); toast.error('Erro ao excluir delegação'); }
    finally { setLoading(false); }
  }, [fetchDelegations]);

  const findApplicableRule = useCallback((valor: number, categoriaId?: string): ApprovalRule | null => {
    let rule = rules.find(r => r.ativo && valor >= r.valor_min && valor <= r.valor_max && r.categoria_id === categoriaId);
    if (!rule) rule = rules.find(r => r.ativo && valor >= r.valor_min && valor <= r.valor_max && !r.categoria_id);
    return rule || null;
  }, [rules]);

  const findApplicableRuleRPC = useCallback(async (valor: number, categoriaId?: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('find_approval_rule', { p_valor: valor, p_categoria_id: categoriaId || undefined });
      if (error) throw error;
      return data as string | null;
    } catch (error: unknown) { console.error('Error finding approval rule via RPC:', error); return null; }
  }, []);

  const getEffectiveApprover = useCallback(async (approverId: string, categoriaId?: string, valor?: number) => {
    try {
      const { data, error } = await supabase.rpc('get_effective_approver', { p_approver_id: approverId, p_categoria_id: categoriaId || undefined, p_valor: valor || undefined });
      if (error) throw error;
      return data as Array<{ approver_id: string; delegation_id: string | null }> | null;
    } catch (error: unknown) { console.error('Error getting effective approver:', error); return null; }
  }, []);

  const createWorkflow = useCallback(async (solicitacaoId: string, valor: number, categoriaId?: string): Promise<ApprovalWorkflow | null> => {
    try {
      setLoading(true);
      
      const { data: sol, error: solError } = await supabase
        .from('solicitacoes')
        .select('*, cost_center:cost_centers(manager_id)')
        .eq('id', solicitacaoId)
        .single();
      
      if (solError) throw solError;

      const ruleId = await findApplicableRuleRPC(valor, categoriaId);
      let rule: ApprovalRule | null = ruleId ? rules.find(r => r.id === ruleId) || null : null;
      if (!rule) rule = findApplicableRule(valor, categoriaId);
      
      const ccManagerId = (sol.cost_center as any)?.manager_id;
      if (!rule && !ccManagerId) { 
        toast.error('Nenhuma regra de aprovação ou gestor de Centro de Custo encontrado'); 
        return null; 
      }

      const prazoLimite = new Date();
      prazoLimite.setHours(prazoLimite.getHours() + (rule?.tempo_limite_horas || 24));

      const { data: workflow, error: workflowError } = await supabase.from('approval_workflows').insert({
        solicitacao_id: solicitacaoId, 
        rule_id: rule?.id || null, 
        status: 'pending', 
        etapa_atual: 1,
        total_etapas: (rule?.aprovadores?.length || 0) + (ccManagerId ? 1 : 0), 
        valor, 
        categoria_id: categoriaId,
        prazo_limite: prazoLimite.toISOString()
      }).select().single();
      
      if (workflowError) throw workflowError;
      const typedWorkflow = workflow as ApprovalWorkflow;

      const steps = [];
      let stepCounter = 1;

      if (ccManagerId) {
        const effective = await getEffectiveApprover(ccManagerId, categoriaId, valor);
        const effectiveId = effective?.[0]?.approver_id || ccManagerId;
        steps.push({
          workflow_id: typedWorkflow.id, 
          etapa: stepCounter++, 
          aprovador_id: ccManagerId,
          aprovador_efetivo_id: effectiveId !== ccManagerId ? effectiveId : null,
          delegacao_id: effective?.[0]?.delegation_id || null,
          prazo_limite: new Date(Date.now() + (rule?.tempo_limite_horas || 24) * 60 * 60 * 1000).toISOString()
        });
      }

      if (rule) {
        for (let index = 0; index < rule.aprovadores.length; index++) {
          const aprovador = rule.aprovadores[index];
          if (aprovador.user_id === ccManagerId) continue;

          const effective = await getEffectiveApprover(aprovador.user_id, categoriaId, valor);
          const effectiveId = effective?.[0]?.approver_id || aprovador.user_id;
          steps.push({
            workflow_id: typedWorkflow.id, 
            etapa: stepCounter++, 
            aprovador_id: aprovador.user_id,
            aprovador_efetivo_id: effectiveId !== aprovador.user_id ? effectiveId : null,
            delegacao_id: effective?.[0]?.delegation_id || null,
            prazo_limite: new Date(Date.now() + (index + 2) * (rule.tempo_limite_horas) * 60 * 60 * 1000).toISOString()
          });
        }
      }

      if (steps.length > 0) {
        await supabase.from('approval_workflows').update({ total_etapas: steps.length }).eq('id', typedWorkflow.id);
        const { error: stepsError } = await supabase.from('approval_steps').insert(steps);
        if (stepsError) throw stepsError;
      }

      await supabase.from('approval_history').insert({
        workflow_id: typedWorkflow.id, solicitacao_id: solicitacaoId, acao: 'created',
        usuario_id: user?.id, usuario_nome: user?.email,
        detalhes: { rule_id: rule?.id, rule_nome: rule?.nome || 'Aprovação por Centro de Custo' }
      });

      toast.success('Workflow de aprovação criado');
      await fetchPendingWorkflows();
      return typedWorkflow;
    } catch (error) { 
      console.error('Error creating workflow:', error); 
      toast.error('Erro ao criar workflow de aprovação'); 
      return null; 
    }
    finally { setLoading(false); }
  }, [user, findApplicableRule, fetchPendingWorkflows, getEffectiveApprover, findApplicableRuleRPC, rules]);

  const approveStep = useCallback(async (stepId: string, comentario?: string) => {
    try {
      setLoading(true);
      const { data: step, error: stepError } = await supabase.from('approval_steps').select('*, approval_workflows(*)').eq('id', stepId).single();
      if (stepError) throw stepError;

      const { error: updateError } = await supabase.from('approval_steps').update({
        status: 'approved', aprovador_efetivo_id: user?.id, comentario, decidido_em: new Date().toISOString()
      }).eq('id', stepId);
      if (updateError) throw updateError;

      const { data: allSteps } = await supabase.from('approval_steps').select('*').eq('workflow_id', step.workflow_id);
      const allApproved = allSteps?.every(s => s.status === 'approved' || s.id === stepId);
      if (allApproved) {
        await supabase.from('approval_workflows').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', step.workflow_id);
      } else {
        await supabase.from('approval_workflows').update({ etapa_atual: step.etapa + 1, updated_at: new Date().toISOString() }).eq('id', step.workflow_id);
      }

      await supabase.from('approval_history').insert({
        workflow_id: step.workflow_id, step_id: stepId, acao: 'approved',
        usuario_id: user?.id, usuario_nome: user?.email, detalhes: { comentario }
      });
      toast.success('Aprovação registrada com sucesso');
      await fetchPendingSteps(); await fetchPendingWorkflows();
    } catch (error) { console.error('Error approving step:', error); toast.error('Erro ao aprovar'); }
    finally { setLoading(false); }
  }, [user, fetchPendingSteps, fetchPendingWorkflows]);

  const rejectStep = useCallback(async (stepId: string, comentario: string) => {
    try {
      setLoading(true);
      const { data: step, error: stepError } = await supabase.from('approval_steps').select('*').eq('id', stepId).single();
      if (stepError) throw stepError;
      await supabase.from('approval_steps').update({ status: 'rejected', aprovador_efetivo_id: user?.id, comentario, decidido_em: new Date().toISOString() }).eq('id', stepId);
      await supabase.from('approval_workflows').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', step.workflow_id);
      await supabase.from('approval_history').insert({
        workflow_id: step.workflow_id, step_id: stepId, acao: 'rejected',
        usuario_id: user?.id, usuario_nome: user?.email, detalhes: { comentario }
      });
      toast.success('Rejeição registrada');
      await fetchPendingSteps(); await fetchPendingWorkflows();
    } catch (error) { console.error('Error rejecting step:', error); toast.error('Erro ao rejeitar'); }
    finally { setLoading(false); }
  }, [user, fetchPendingSteps, fetchPendingWorkflows]);

  const fetchHistory = useCallback(async (workflowId: string): Promise<ApprovalHistory[]> => {
    try {
      const { data, error } = await supabase.from('approval_history').select('*').eq('workflow_id', workflowId).order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ApprovalHistory[];
    } catch (error) { console.error('Error fetching history:', error); return []; }
  }, []);

  const fetchAllHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('approval_history').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      setAllHistory((data || []) as ApprovalHistory[]);
    } catch (error) { console.error('Error fetching all history:', error); }
  }, []);

  const checkEscalations = useCallback(async () => {
    try {
      const { data: overdueWorkflows } = await supabase.from('approval_workflows').select('*, approval_rules(*)').eq('status', 'pending').lt('prazo_limite', new Date().toISOString()).is('escalado_em', null);
      if (!overdueWorkflows?.length) return;
      for (const workflow of overdueWorkflows) {
        const rule = workflow.approval_rules;
        if (!rule?.escalacao_automatica || !rule?.escalacao_para) continue;
        await supabase.from('approval_workflows').update({ status: 'escalated', escalado_em: new Date().toISOString(), escalado_para: rule.escalacao_para }).eq('id', workflow.id);
        await supabase.from('approval_steps').insert({ workflow_id: workflow.id, etapa: workflow.etapa_atual + 1, aprovador_id: rule.escalacao_para, prazo_limite: new Date(Date.now() + rule.tempo_limite_horas * 60 * 60 * 1000).toISOString() });
        await supabase.from('approval_history').insert({ workflow_id: workflow.id, solicitacao_id: workflow.solicitacao_id, acao: 'escalated', detalhes: { escalado_para: rule.escalacao_para, motivo: 'Prazo expirado' } });
      }
      await fetchPendingWorkflows(); await fetchPendingSteps();
    } catch (error) { console.error('Error checking escalations:', error); }
  }, [fetchPendingWorkflows, fetchPendingSteps]);

  // Realtime subscription is now standard across the app
  // Removed custom subscription here to avoid duplication as useRealtimeSubscription handles it globally

  useEffect(() => { fetchRules(); fetchDelegations(); fetchPendingWorkflows(); fetchPendingSteps(); }, [fetchRules, fetchDelegations, fetchPendingWorkflows, fetchPendingSteps]);
  useEffect(() => { const interval = setInterval(checkEscalations, 60000); return () => clearInterval(interval); }, [checkEscalations]);

  return {
    rules, delegations, workflows, pendingSteps, allHistory, loading,
    saveRule, deleteRule, saveDelegation, deleteDelegation,
    findApplicableRule, findApplicableRuleRPC, getEffectiveApprover,
    createWorkflow, approveStep, rejectStep, fetchHistory, fetchAllHistory, checkEscalations,
    refetch: useCallback(() => { fetchRules(); fetchDelegations(); fetchPendingWorkflows(); fetchPendingSteps(); }, [fetchRules, fetchDelegations, fetchPendingWorkflows, fetchPendingSteps])
  };
};
