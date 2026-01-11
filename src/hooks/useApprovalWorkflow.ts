import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ApprovalRule {
  id: string;
  nome: string;
  descricao?: string;
  valor_min: number;
  valor_max: number;
  categoria_id?: string;
  aprovadores: Array<{ user_id: string; ordem: number; nome?: string }>;
  tempo_limite_horas: number;
  escalacao_automatica: boolean;
  escalacao_para?: string;
  niveis_aprovacao: number;
  requer_unanimidade: boolean;
  ativo: boolean;
  prioridade: number;
  created_at: string;
  updated_at: string;
}

export interface ApprovalDelegation {
  id: string;
  delegante_id: string;
  delegado_id: string;
  data_inicio: string;
  data_fim: string;
  motivo?: string;
  categorias_permitidas: string[];
  valor_maximo?: number;
  ativo: boolean;
  created_at: string;
  delegante_nome?: string;
  delegado_nome?: string;
}

export interface ApprovalWorkflow {
  id: string;
  solicitacao_id: string;
  rule_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled';
  etapa_atual: number;
  total_etapas: number;
  valor: number;
  categoria_id?: string;
  prazo_limite?: string;
  escalado_em?: string;
  escalado_para?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalStep {
  id: string;
  workflow_id: string;
  etapa: number;
  aprovador_id: string;
  aprovador_efetivo_id?: string;
  delegacao_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  comentario?: string;
  decidido_em?: string;
  prazo_limite?: string;
  notificado_em?: string;
  lembrete_enviado: boolean;
  created_at: string;
  aprovador_nome?: string;
}

export interface ApprovalHistory {
  id: string;
  workflow_id?: string;
  solicitacao_id?: string;
  step_id?: string;
  acao: 'created' | 'approved' | 'rejected' | 'escalated' | 'delegated' | 'reminder_sent' | 'cancelled';
  usuario_id?: string;
  usuario_nome?: string;
  detalhes?: Record<string, unknown>;
  created_at: string;
}

export const useApprovalWorkflow = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [delegations, setDelegations] = useState<ApprovalDelegation[]>([]);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [pendingSteps, setPendingSteps] = useState<ApprovalStep[]>([]);
  const [allHistory, setAllHistory] = useState<ApprovalHistory[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch approval rules
  const fetchRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('approval_rules')
        .select('*')
        .order('prioridade', { ascending: false })
        .order('valor_min', { ascending: true });

      if (error) throw error;
      
      setRules((data || []).map(rule => ({
        ...rule,
        aprovadores: typeof rule.aprovadores === 'string' 
          ? JSON.parse(rule.aprovadores) 
          : rule.aprovadores || []
      })));
    } catch (error) {
      console.error('Error fetching approval rules:', error);
    }
  }, []);

  // Fetch delegations
  const fetchDelegations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('approval_delegations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setDelegations((data || []).map(d => ({
        ...d,
        categorias_permitidas: typeof d.categorias_permitidas === 'string'
          ? JSON.parse(d.categorias_permitidas)
          : d.categorias_permitidas || []
      })));
    } catch (error) {
      console.error('Error fetching delegations:', error);
    }
  }, []);

  // Fetch pending workflows for current user
  const fetchPendingWorkflows = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('approval_workflows')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows((data || []) as ApprovalWorkflow[]);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    }
  }, [user]);

  // Fetch pending steps for current user
  const fetchPendingSteps = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('approval_steps')
        .select('*')
        .eq('status', 'pending')
        .or(`aprovador_id.eq.${user.id},aprovador_efetivo_id.eq.${user.id}`)
        .order('prazo_limite', { ascending: true });

      if (error) throw error;
      setPendingSteps((data || []) as ApprovalStep[]);
    } catch (error) {
      console.error('Error fetching pending steps:', error);
    }
  }, [user]);

  // Create or update approval rule
  const saveRule = useCallback(async (rule: Partial<ApprovalRule>) => {
    try {
      setLoading(true);
      const ruleData = {
        nome: rule.nome || '',
        descricao: rule.descricao,
        valor_min: rule.valor_min || 0,
        valor_max: rule.valor_max || 999999999,
        categoria_id: rule.categoria_id,
        aprovadores: JSON.stringify(rule.aprovadores || []),
        tempo_limite_horas: rule.tempo_limite_horas || 24,
        escalacao_automatica: rule.escalacao_automatica || false,
        escalacao_para: rule.escalacao_para,
        niveis_aprovacao: rule.niveis_aprovacao || 1,
        requer_unanimidade: rule.requer_unanimidade || false,
        ativo: rule.ativo ?? true,
        prioridade: rule.prioridade || 0,
        created_by: user?.id
      };

      if (rule.id) {
        const { error } = await supabase
          .from('approval_rules')
          .update(ruleData)
          .eq('id', rule.id);
        
        if (error) throw error;
        toast.success('Regra atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('approval_rules')
          .insert(ruleData);
        
        if (error) throw error;
        toast.success('Regra criada com sucesso');
      }

      await fetchRules();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Erro ao salvar regra');
    } finally {
      setLoading(false);
    }
  }, [user, fetchRules]);

  // Delete approval rule
  const deleteRule = useCallback(async (ruleId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('approval_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      toast.success('Regra excluída com sucesso');
      await fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Erro ao excluir regra');
    } finally {
      setLoading(false);
    }
  }, [fetchRules]);

  // Create delegation
  const saveDelegation = useCallback(async (delegation: Partial<ApprovalDelegation>) => {
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
        ativo: delegation.ativo ?? true
      };

      if (delegation.id) {
        const { error } = await supabase
          .from('approval_delegations')
          .update(delegationData)
          .eq('id', delegation.id);
        
        if (error) throw error;
        toast.success('Delegação atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('approval_delegations')
          .insert(delegationData);
        
        if (error) throw error;
        toast.success('Delegação criada com sucesso');
      }

      await fetchDelegations();
    } catch (error) {
      console.error('Error saving delegation:', error);
      toast.error('Erro ao salvar delegação');
    } finally {
      setLoading(false);
    }
  }, [fetchDelegations]);

  // Delete delegation
  const deleteDelegation = useCallback(async (delegationId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('approval_delegations')
        .delete()
        .eq('id', delegationId);

      if (error) throw error;
      toast.success('Delegação excluída com sucesso');
      await fetchDelegations();
    } catch (error) {
      console.error('Error deleting delegation:', error);
      toast.error('Erro ao excluir delegação');
    } finally {
      setLoading(false);
    }
  }, [fetchDelegations]);

  // Find applicable rule for a given value and category
  const findApplicableRule = useCallback((valor: number, categoriaId?: string): ApprovalRule | null => {
    // First try to find category-specific rule
    let rule = rules.find(r => 
      r.ativo &&
      valor >= r.valor_min &&
      valor <= r.valor_max &&
      r.categoria_id === categoriaId
    );

    // If no category-specific rule, find general rule
    if (!rule) {
      rule = rules.find(r => 
        r.ativo &&
        valor >= r.valor_min &&
        valor <= r.valor_max &&
        !r.categoria_id
      );
    }

    return rule || null;
  }, [rules]);

  // Create workflow for a solicitação
  const createWorkflow = useCallback(async (
    solicitacaoId: string, 
    valor: number, 
    categoriaId?: string
  ): Promise<ApprovalWorkflow | null> => {
    try {
      setLoading(true);
      const rule = findApplicableRule(valor, categoriaId);
      
      if (!rule) {
        toast.error('Nenhuma regra de aprovação encontrada para este valor');
        return null;
      }

      const prazoLimite = new Date();
      prazoLimite.setHours(prazoLimite.getHours() + rule.tempo_limite_horas);

      const { data: workflow, error: workflowError } = await supabase
        .from('approval_workflows')
        .insert({
          solicitacao_id: solicitacaoId,
          rule_id: rule.id,
          status: 'pending',
          etapa_atual: 1,
          total_etapas: rule.aprovadores.length,
          valor,
          categoria_id: categoriaId,
          prazo_limite: prazoLimite.toISOString()
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      const typedWorkflow = workflow as ApprovalWorkflow;

      // Create steps for each approver
      const steps = rule.aprovadores.map((aprovador, index) => ({
        workflow_id: typedWorkflow.id,
        etapa: index + 1,
        aprovador_id: aprovador.user_id,
        prazo_limite: new Date(
          Date.now() + (index + 1) * rule.tempo_limite_horas * 60 * 60 * 1000
        ).toISOString()
      }));

      const { error: stepsError } = await supabase
        .from('approval_steps')
        .insert(steps);

      if (stepsError) throw stepsError;

      // Log creation
      await supabase.from('approval_history').insert({
        workflow_id: typedWorkflow.id,
        solicitacao_id: solicitacaoId,
        acao: 'created',
        usuario_id: user?.id,
        usuario_nome: user?.email,
        detalhes: { rule_id: rule.id, rule_nome: rule.nome }
      });

      toast.success('Workflow de aprovação criado');
      await fetchPendingWorkflows();
      return typedWorkflow;
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast.error('Erro ao criar workflow de aprovação');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, findApplicableRule, fetchPendingWorkflows]);

  // Approve a step
  const approveStep = useCallback(async (stepId: string, comentario?: string) => {
    try {
      setLoading(true);

      // Get step and workflow info
      const { data: step, error: stepError } = await supabase
        .from('approval_steps')
        .select('*, approval_workflows(*)')
        .eq('id', stepId)
        .single();

      if (stepError) throw stepError;

      // Update step
      const { error: updateError } = await supabase
        .from('approval_steps')
        .update({
          status: 'approved',
          aprovador_efetivo_id: user?.id,
          comentario,
          decidido_em: new Date().toISOString()
        })
        .eq('id', stepId);

      if (updateError) throw updateError;

      // Check if all steps are approved
      const { data: allSteps } = await supabase
        .from('approval_steps')
        .select('*')
        .eq('workflow_id', step.workflow_id);

      const allApproved = allSteps?.every(s => s.status === 'approved' || s.id === stepId);

      if (allApproved) {
        await supabase
          .from('approval_workflows')
          .update({ status: 'approved', updated_at: new Date().toISOString() })
          .eq('id', step.workflow_id);
      } else {
        // Move to next step
        await supabase
          .from('approval_workflows')
          .update({ 
            etapa_atual: step.etapa + 1, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', step.workflow_id);
      }

      // Log approval
      await supabase.from('approval_history').insert({
        workflow_id: step.workflow_id,
        step_id: stepId,
        acao: 'approved',
        usuario_id: user?.id,
        usuario_nome: user?.email,
        detalhes: { comentario }
      });

      toast.success('Aprovação registrada com sucesso');
      await fetchPendingSteps();
      await fetchPendingWorkflows();
    } catch (error) {
      console.error('Error approving step:', error);
      toast.error('Erro ao aprovar');
    } finally {
      setLoading(false);
    }
  }, [user, fetchPendingSteps, fetchPendingWorkflows]);

  // Reject a step
  const rejectStep = useCallback(async (stepId: string, comentario: string) => {
    try {
      setLoading(true);

      const { data: step, error: stepError } = await supabase
        .from('approval_steps')
        .select('*')
        .eq('id', stepId)
        .single();

      if (stepError) throw stepError;

      // Update step
      await supabase
        .from('approval_steps')
        .update({
          status: 'rejected',
          aprovador_efetivo_id: user?.id,
          comentario,
          decidido_em: new Date().toISOString()
        })
        .eq('id', stepId);

      // Update workflow
      await supabase
        .from('approval_workflows')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', step.workflow_id);

      // Log rejection
      await supabase.from('approval_history').insert({
        workflow_id: step.workflow_id,
        step_id: stepId,
        acao: 'rejected',
        usuario_id: user?.id,
        usuario_nome: user?.email,
        detalhes: { comentario }
      });

      toast.success('Rejeição registrada');
      await fetchPendingSteps();
      await fetchPendingWorkflows();
    } catch (error) {
      console.error('Error rejecting step:', error);
      toast.error('Erro ao rejeitar');
    } finally {
      setLoading(false);
    }
  }, [user, fetchPendingSteps, fetchPendingWorkflows]);

  // Fetch history for a workflow
  const fetchHistory = useCallback(async (workflowId: string): Promise<ApprovalHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('approval_history')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as ApprovalHistory[];
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  }, []);

  // Fetch all history (for the history tab)
  const fetchAllHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('approval_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAllHistory((data || []) as ApprovalHistory[]);
    } catch (error) {
      console.error('Error fetching all history:', error);
    }
  }, []);

  // Check and trigger escalations
  const checkEscalations = useCallback(async () => {
    try {
      // Find overdue workflows
      const { data: overdueWorkflows } = await supabase
        .from('approval_workflows')
        .select('*, approval_rules(*)')
        .eq('status', 'pending')
        .lt('prazo_limite', new Date().toISOString())
        .is('escalado_em', null);

      if (!overdueWorkflows?.length) return;

      for (const workflow of overdueWorkflows) {
        const rule = workflow.approval_rules;
        if (!rule?.escalacao_automatica || !rule?.escalacao_para) continue;

        // Update workflow as escalated
        await supabase
          .from('approval_workflows')
          .update({
            status: 'escalated',
            escalado_em: new Date().toISOString(),
            escalado_para: rule.escalacao_para
          })
          .eq('id', workflow.id);

        // Create escalation step
        await supabase.from('approval_steps').insert({
          workflow_id: workflow.id,
          etapa: workflow.etapa_atual + 1,
          aprovador_id: rule.escalacao_para,
          prazo_limite: new Date(
            Date.now() + rule.tempo_limite_horas * 60 * 60 * 1000
          ).toISOString()
        });

        // Log escalation
        await supabase.from('approval_history').insert({
          workflow_id: workflow.id,
          solicitacao_id: workflow.solicitacao_id,
          acao: 'escalated',
          detalhes: { 
            escalado_para: rule.escalacao_para,
            motivo: 'Prazo expirado'
          }
        });
      }

      await fetchPendingWorkflows();
      await fetchPendingSteps();
    } catch (error) {
      console.error('Error checking escalations:', error);
    }
  }, [fetchPendingWorkflows, fetchPendingSteps]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const workflowChannel = supabase
      .channel('approval-workflows')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'approval_workflows' },
        () => {
          fetchPendingWorkflows();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'approval_steps' },
        () => {
          fetchPendingSteps();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workflowChannel);
    };
  }, [user, fetchPendingWorkflows, fetchPendingSteps]);

  // Initial fetch
  useEffect(() => {
    fetchRules();
    fetchDelegations();
    fetchPendingWorkflows();
    fetchPendingSteps();
  }, [fetchRules, fetchDelegations, fetchPendingWorkflows, fetchPendingSteps]);

  // Periodic escalation check
  useEffect(() => {
    const interval = setInterval(checkEscalations, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkEscalations]);

  return {
    rules,
    delegations,
    workflows,
    pendingSteps,
    allHistory,
    loading,
    saveRule,
    deleteRule,
    saveDelegation,
    deleteDelegation,
    findApplicableRule,
    createWorkflow,
    approveStep,
    rejectStep,
    fetchHistory,
    fetchAllHistory,
    checkEscalations,
    refetch: useCallback(() => {
      fetchRules();
      fetchDelegations();
      fetchPendingWorkflows();
      fetchPendingSteps();
    }, [fetchRules, fetchDelegations, fetchPendingWorkflows, fetchPendingSteps])
  };
};
