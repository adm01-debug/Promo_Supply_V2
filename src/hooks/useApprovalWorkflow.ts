import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/feedbackToast';
import { logger } from '@/lib/logger';
import { useWorkflowDLQ } from './useWorkflowDLQ';
import { useApprovalRules } from './useApprovalRules';
import { useApprovalHistory } from './useApprovalHistory';
import type { Database } from '@/integrations/supabase/types';
import type {
  ApprovalWorkflow,
  ApprovalWorkflowWithRelations,
  ApprovalStep,
} from './approvalWorkflowTypes';

type ApprovalStepInsert = Database['public']['Tables']['approval_steps']['Insert'];

export type {
  ApprovalRule, ApprovalDelegation, ApprovalWorkflow,
  ApprovalWorkflowWithRelations, ApprovalStep, ApprovalHistory,
} from './approvalWorkflowTypes';

// Module-level guard so only one consumer drives escalation polling.
// `latestCheckEscalations` is a ref updated on every render so the interval
// always calls the freshest closure (avoids stale user/org/fetch bindings).
let escalationRefCount = 0;
let escalationIntervalId: ReturnType<typeof setInterval> | null = null;
let latestCheckEscalations: (() => Promise<void>) | null = null;

/**
 * F-022 refactor: useApprovalWorkflow is now a composition facade.
 * Business logic lives in focused sub-hooks:
 *   - useApprovalRules    → rules/delegations CRUD + findApplicableRule
 *   - useApprovalHistory  → fetchHistory / fetchAllHistory
 * Workflow state (pending workflows/steps) and step actions remain here.
 */
export const useApprovalWorkflow = () => {
  const { user, organizationId } = useAuth();
  const [workflows, setWorkflows] = useState<ApprovalWorkflowWithRelations[]>([]);
  const [pendingSteps, setPendingSteps] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState(false);

  const rulesApi = useApprovalRules();
  const historyApi = useApprovalHistory();
  const { pushToDLQ, dlqEntries, retryableEntries, retryEntry, removeEntry, clearDLQ } = useWorkflowDLQ();

  // Stable refs to rulesApi methods (rulesApi object literal is rebuilt each render
  // — including it in a useEffect dep array triggers an infinite re-run).
  const fetchRulesRef = useRef(rulesApi.fetchRules);
  const fetchDelegationsRef = useRef(rulesApi.fetchDelegations);
  fetchRulesRef.current = rulesApi.fetchRules;
  fetchDelegationsRef.current = rulesApi.fetchDelegations;

  // ── Workflow / step fetches ──────────────────────────────────────────────

  const fetchPendingWorkflows = useCallback(async () => {
    if (!user || !organizationId) return;
    try {
      const { data, error } = await supabase
        .from('approval_workflows')
        .select('*, solicitacoes:solicitacoes(numero, titulo, prioridade)')
        .eq('status', 'pending')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWorkflows((data ?? []) as unknown as ApprovalWorkflowWithRelations[]);
    } catch (error) { logger.error('Error fetching workflows', { error }); }
  }, [user, organizationId]);

  const fetchPendingSteps = useCallback(async () => {
    if (!user || !organizationId) return;
    try {
      const { data, error } = await supabase.from('approval_steps').select('*')
        .eq('status', 'pending')
        .eq('organization_id', organizationId)
        .or(`aprovador_id.eq.${user.id},aprovador_efetivo_id.eq.${user.id}`)
        .order('prazo_limite', { ascending: true });
      if (error) throw error;
      setPendingSteps((data || []) as ApprovalStep[]);
    } catch (error) { logger.error('Error fetching pending steps', { error }); }
  }, [user, organizationId]);

  // ── Workflow creation ────────────────────────────────────────────────────

  const createWorkflow = useCallback(async (
    solicitacaoId: string,
    valor: number,
    categoriaId?: string,
  ): Promise<ApprovalWorkflow | null> => {
    if (!organizationId) return null;
    try {
      setLoading(true);

      const { data: sol, error: solError } = await supabase
        .from('solicitacoes')
        .select('*, cost_center:cost_centers(manager_id)')
        .eq('id', solicitacaoId)
        .single();
      if (solError) throw solError;

      const ruleId = await rulesApi.findApplicableRuleRPC(valor, categoriaId);
      let rule = ruleId ? rulesApi.rules.find(r => r.id === ruleId) || null : null;
      if (!rule) rule = rulesApi.findApplicableRule(valor, categoriaId);

      const ccManagerId = (sol.cost_center as { manager_id: string | null } | null)?.manager_id;
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
        prazo_limite: prazoLimite.toISOString(),
        organization_id: organizationId,
      }).select().single();
      if (workflowError) throw workflowError;
      const typedWorkflow = workflow as ApprovalWorkflow;

      const steps: ApprovalStepInsert[] = [];
      let stepCounter = 1;

      if (ccManagerId) {
        const effective = await rulesApi.getEffectiveApprover(ccManagerId, categoriaId, valor);
        const effectiveId = effective?.[0]?.approver_id || ccManagerId;
        steps.push({
          workflow_id: typedWorkflow.id, etapa: stepCounter++, aprovador_id: ccManagerId,
          aprovador_efetivo_id: effectiveId !== ccManagerId ? effectiveId : null,
          delegacao_id: effective?.[0]?.delegation_id || null,
          prazo_limite: new Date(Date.now() + (rule?.tempo_limite_horas || 24) * 3600_000).toISOString(),
          organization_id: organizationId,
        });
      }

      if (rule) {
        for (let i = 0; i < rule.aprovadores.length; i++) {
          const aprovador = rule.aprovadores[i];
          if (aprovador.user_id === ccManagerId) continue;
          const effective = await rulesApi.getEffectiveApprover(aprovador.user_id, categoriaId, valor);
          const effectiveId = effective?.[0]?.approver_id || aprovador.user_id;
          steps.push({
            workflow_id: typedWorkflow.id, etapa: stepCounter++, aprovador_id: aprovador.user_id,
            aprovador_efetivo_id: effectiveId !== aprovador.user_id ? effectiveId : null,
            delegacao_id: effective?.[0]?.delegation_id || null,
            prazo_limite: new Date(Date.now() + (i + 2) * rule.tempo_limite_horas * 3600_000).toISOString(),
            organization_id: organizationId,
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
        detalhes: { rule_id: rule?.id, rule_nome: rule?.nome || 'Aprovação por Centro de Custo' },
      });

      toast.success('Workflow de aprovação criado');
      await fetchPendingWorkflows();
      return typedWorkflow;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error creating workflow', { error });
      pushToDLQ('create_workflow', { solicitacaoId, valor, categoriaId, organizationId, userId: user?.id }, errMsg);
      toast.error('Erro ao criar workflow de aprovação — salvo para reprocessamento');
      return null;
    } finally { setLoading(false); }
  }, [user, rulesApi, fetchPendingWorkflows, organizationId, pushToDLQ]);

  // ── Step actions ─────────────────────────────────────────────────────────

  const approveStep = useCallback(async (stepId: string, comentario?: string) => {
    try {
      setLoading(true);
      const { data: step, error: stepError } = await supabase.from('approval_steps')
        .select('*, approval_workflows(*)')
        .eq('id', stepId).single();
      if (stepError) throw stepError;

      const workflow = step.approval_workflows;
      let requiresUnanimity = false;
      if (workflow?.rule_id) {
        const { data: rule } = await supabase.from('approval_rules')
          .select('requer_unanimidade').eq('id', workflow.rule_id).single();
        requiresUnanimity = rule?.requer_unanimidade || false;
      }

      const { error: updateError } = await supabase.from('approval_steps').update({
        status: 'approved', aprovador_efetivo_id: user?.id, comentario,
        decidido_em: new Date().toISOString(),
      }).eq('id', stepId);
      if (updateError) throw updateError;

      const { data: allSteps } = await supabase.from('approval_steps').select('*').eq('workflow_id', step.workflow_id);
      const allOtherSteps = allSteps?.filter(s => s.id !== stepId) || [];
      const allApproved = allOtherSteps.every(s => s.status === 'approved' || s.status === 'skipped');

      if (allApproved) {
        const { data: current } = await supabase.from('approval_workflows').select('status').eq('id', step.workflow_id).single();
        if (current?.status === 'pending') {
          await supabase.from('approval_workflows').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', step.workflow_id);
          toast.success('Aprovação finalizada! Solicitação liberada.');
        }
      } else {
        const nextStep = allOtherSteps.find(s => s.status === 'pending' && s.etapa > step.etapa);
        if (nextStep) {
          await supabase.from('approval_workflows').update({ etapa_atual: nextStep.etapa, updated_at: new Date().toISOString() }).eq('id', step.workflow_id);
        } else if (!requiresUnanimity) {
          await supabase.from('approval_workflows').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', step.workflow_id);
        }
      }

      await supabase.from('approval_history').insert({
        workflow_id: step.workflow_id, step_id: stepId, acao: 'approved',
        usuario_id: user?.id, usuario_nome: user?.email, detalhes: { comentario },
      });
      toast.success('Aprovação registrada com sucesso');
      await fetchPendingSteps();
      await fetchPendingWorkflows();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error approving step', { error });
      pushToDLQ('approve_step', { stepId, comentario, userId: user?.id }, errMsg);
      toast.error('Erro ao aprovar — salvo para reprocessamento');
    } finally { setLoading(false); }
  }, [user, fetchPendingSteps, fetchPendingWorkflows, pushToDLQ]);

  const rejectStep = useCallback(async (stepId: string, comentario: string) => {
    try {
      setLoading(true);
      const { data: step, error: stepError } = await supabase.from('approval_steps')
        .select('*').eq('id', stepId).single();
      if (stepError) throw stepError;

      await supabase.from('approval_steps').update({
        status: 'rejected', aprovador_efetivo_id: user?.id, comentario,
        decidido_em: new Date().toISOString(),
      }).eq('id', stepId);
      await supabase.from('approval_workflows').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', step.workflow_id);
      await supabase.from('approval_steps').update({ status: 'skipped', comentario: 'Workflow rejected at previous step' })
        .eq('workflow_id', step.workflow_id).eq('status', 'pending');
      await supabase.from('approval_history').insert({
        workflow_id: step.workflow_id, step_id: stepId, acao: 'rejected',
        usuario_id: user?.id, usuario_nome: user?.email, detalhes: { comentario },
      });
      toast.success('Rejeição registrada');
      await fetchPendingSteps();
      await fetchPendingWorkflows();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error rejecting step', { error });
      pushToDLQ('reject_step', { stepId, comentario, userId: user?.id }, errMsg);
      toast.error('Erro ao rejeitar — salvo para reprocessamento');
    } finally { setLoading(false); }
  }, [user, fetchPendingSteps, fetchPendingWorkflows, pushToDLQ]);

  // ── Escalation polling (local UX guard — server cron is the real enforcer) ─

  const checkEscalations = useCallback(async () => {
    try {
      const { data: overdue } = await supabase.from('approval_workflows')
        .select('*, approval_rules(*)')
        .eq('status', 'pending')
        .lt('prazo_limite', new Date().toISOString())
        .is('escalado_em', null);
      if (!overdue?.length) return;
      for (const wf of overdue) {
        const rule = wf.approval_rules;
        if (!rule?.escalacao_automatica || !rule?.escalacao_para) continue;
        await supabase.from('approval_workflows').update({
          status: 'escalated', escalado_em: new Date().toISOString(), escalado_para: rule.escalacao_para,
        }).eq('id', wf.id);
        await supabase.from('approval_steps').insert({
          workflow_id: wf.id, etapa: wf.etapa_atual + 1, aprovador_id: rule.escalacao_para,
          prazo_limite: new Date(Date.now() + rule.tempo_limite_horas * 3600_000).toISOString(),
        });
        await supabase.from('approval_history').insert({
          workflow_id: wf.id, solicitacao_id: wf.solicitacao_id, acao: 'escalated',
          detalhes: { escalado_para: rule.escalacao_para, motivo: 'Prazo expirado' },
        });
      }
      await fetchPendingWorkflows();
      await fetchPendingSteps();
    } catch (error) { logger.error('Error checking escalations', { error }); }
  }, [fetchPendingWorkflows, fetchPendingSteps]);

  // ── Bootstrap ────────────────────────────────────────────────────────────

  useEffect(() => {
    void Promise.all([
      fetchRulesRef.current(),
      fetchDelegationsRef.current(),
      fetchPendingWorkflows(),
      fetchPendingSteps(),
    ]);
  }, [fetchPendingWorkflows, fetchPendingSteps]);

  useEffect(() => {
    latestCheckEscalations = checkEscalations;
    escalationRefCount += 1;
    if (escalationRefCount === 1) {
      escalationIntervalId = setInterval(() => {
        void latestCheckEscalations?.();
      }, 60000);
    }
    return () => {
      escalationRefCount = Math.max(0, escalationRefCount - 1);
      if (escalationRefCount === 0) {
        if (escalationIntervalId !== null) {
          clearInterval(escalationIntervalId);
          escalationIntervalId = null;
        }
        latestCheckEscalations = null;
      }
    };
  }, [checkEscalations]);

  return {
    // State
    rules: rulesApi.rules,
    delegations: rulesApi.delegations,
    workflows,
    pendingSteps,
    allHistory: historyApi.allHistory,
    loading: loading || rulesApi.loading,
    // Fetches
    fetchRules: rulesApi.fetchRules,
    fetchDelegations: rulesApi.fetchDelegations,
    fetchPendingWorkflows,
    fetchPendingSteps,
    fetchHistory: historyApi.fetchHistory,
    fetchAllHistory: historyApi.fetchAllHistory,
    // Rule/delegation mutations
    saveRule: rulesApi.saveRule,
    deleteRule: rulesApi.deleteRule,
    saveDelegation: rulesApi.saveDelegation,
    deleteDelegation: rulesApi.deleteDelegation,
    // Workflow actions
    createWorkflow,
    approveStep,
    rejectStep,
    checkEscalations,
    // Dead-letter queue
    workflowDLQ: { dlqEntries, retryableEntries, retryEntry, removeEntry, clearDLQ },
  };
};
