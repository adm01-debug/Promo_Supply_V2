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
 *   - useApprovalRules    → rules/delegations CRUD + findApplicableRuleRPC
 *   - useApprovalHistory  → fetchHistory / fetchAllHistory
 * Workflow state (pending workflows/steps) and step actions remain here.
 */
// O erro do PostgREST e um objeto simples ({ message, details, hint }), nao um
// Error: `String(error)` imprimiria "[object Object]" na tela (QA 251).
const mensagemDeErro = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : ((error as { message?: string } | null)?.message ?? String(error));

export const useApprovalWorkflow = () => {
  const { user, organizationId } = useAuth();
  const [workflows, setWorkflows] = useState<ApprovalWorkflowWithRelations[]>([]);
  const [pendingSteps, setPendingSteps] = useState<ApprovalStep[]>([]);
  // Tudo o que ja passou pela aprovacao existe so no espelho filtrado de pendentes
  // ate aqui: sem estas duas listas a tela de Aprovacoes nao tinha como contar
  // decididos nem medir tempo de decisao (QA 099/100).
  const [allWorkflows, setAllWorkflows] = useState<ApprovalWorkflowWithRelations[]>([]);
  const [allSteps, setAllSteps] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState(false);
  // Falha de leitura nao pode virar "nada pendente" (QA 251): os fetches abaixo
  // engoliam o erro no logger, entao a tela de aprovacoes anunciava "todas as
  // solicitacoes foram processadas" quando a consulta tinha falhado.
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchesEmCursoRef = useRef(0);

  const iniciarFetch = useCallback(() => {
    fetchesEmCursoRef.current += 1;
    setFetching(true);
  }, []);

  const encerrarFetch = useCallback(() => {
    fetchesEmCursoRef.current = Math.max(0, fetchesEmCursoRef.current - 1);
    if (fetchesEmCursoRef.current === 0) setFetching(false);
  }, []);

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
    iniciarFetch();
    try {
      const { data, error } = await supabase
        .from('approval_workflows')
        .select('*, solicitacoes:solicitacoes(numero, titulo, prioridade)')
        .eq('status', 'pending')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWorkflows((data ?? []) as unknown as ApprovalWorkflowWithRelations[]);
      setFetchError(null);
    } catch (error) {
      logger.error('Error fetching workflows', { error });
      setFetchError(mensagemDeErro(error));
    } finally {
      encerrarFetch();
    }
  }, [user, organizationId, iniciarFetch, encerrarFetch]);

  const fetchPendingSteps = useCallback(async () => {
    if (!user || !organizationId) return;
    iniciarFetch();
    try {
      const { data, error } = await supabase.from('approval_steps').select('*')
        .eq('status', 'pending')
        .eq('organization_id', organizationId)
        .or(`aprovador_id.eq.${user.id},aprovador_efetivo_id.eq.${user.id}`)
        .order('prazo_limite', { ascending: true });
      if (error) throw error;
      setPendingSteps((data || []) as ApprovalStep[]);
      setFetchError(null);
    } catch (error) {
      logger.error('Error fetching pending steps', { error });
      setFetchError(mensagemDeErro(error));
    } finally {
      encerrarFetch();
    }
  }, [user, organizationId, iniciarFetch, encerrarFetch]);

  const fetchAllWorkflows = useCallback(async () => {
    if (!user || !organizationId) return;
    try {
      const { data, error } = await supabase
        .from('approval_workflows')
        .select('*, solicitacoes:solicitacoes(numero, titulo, prioridade)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setAllWorkflows((data ?? []) as unknown as ApprovalWorkflowWithRelations[]);
    } catch (error) { logger.error('Error fetching all workflows', { error }); }
  }, [user, organizationId]);

  const fetchAllSteps = useCallback(async () => {
    if (!user || !organizationId) return;
    try {
      const { data, error } = await supabase.from('approval_steps').select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setAllSteps((data || []) as ApprovalStep[]);
    } catch (error) { logger.error('Error fetching all steps', { error }); }
  }, [user, organizationId]);

  // ── Workflow creation ────────────────────────────────────────────────────

  const createWorkflow = useCallback(async (
    solicitacaoId: string,
    valor: number,
    categoriaId?: string,
    fromDLQ = false,
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
      const rule = ruleId ? rulesApi.rules.find(r => r.id === ruleId) || null : null;

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
      if (!fromDLQ) {
        pushToDLQ('create_workflow', { solicitacaoId, valor, categoriaId, organizationId, userId: user?.id }, errMsg);
        toast.error('Erro ao criar workflow de aprovação — salvo para reprocessamento');
      }
      return null;
    } finally { setLoading(false); }
  }, [user, rulesApi, fetchPendingWorkflows, organizationId, pushToDLQ]);

  // ── Step actions ─────────────────────────────────────────────────────────

  const approveStep = useCallback(async (stepId: string, comentario?: string, fromDLQ = false): Promise<boolean> => {
    try {
      setLoading(true);
      const { data: step, error: stepError } = await supabase.from('approval_steps')
        .select('*, approval_workflows(*)')
        .eq('id', stepId).single();
      if (stepError) throw stepError;

      const workflow = step.approval_workflows;

      // A ordem das etapas e pre-condicao, nao ordenacao de exibicao: aprovar a
      // ultima etapa primeiro fechava o workflow com as anteriores pendentes e o
      // trigger liberava a solicitacao. Reaprovar etapa ja decidida tambem passa.
      if (workflow?.status !== 'pending') {
        toast.error('Este fluxo de aprovação já foi encerrado.');
        return false;
      }
      if (step.status !== 'pending') {
        toast.error('Esta etapa já foi decidida.');
        return false;
      }
      if (step.etapa !== workflow.etapa_atual) {
        toast.error(`Etapa fora de ordem: agora é a vez da etapa ${workflow.etapa_atual}.`);
        logger.error('Aprovacao fora de ordem recusada', {
          stepId, etapa: step.etapa, etapaAtual: workflow.etapa_atual,
        });
        return false;
      }

      // Segregacao de funcao: quem criou a solicitacao nao decide a propria aprovacao.
      if (workflow.solicitacao_id) {
        const { data: solicitacao } = await supabase.from('solicitacoes')
          .select('solicitante_id').eq('id', workflow.solicitacao_id).single();
        if (solicitacao?.solicitante_id && solicitacao.solicitante_id === user?.id) {
          logger.error('Aprovacao recusada por segregacao de funcao', { stepId });
          toast.error('Segregação de funções: a solicitação não pode ser aprovada por quem a criou.');
          return false;
        }
      }

      // O RLS filtra a linha em silencio: update de 0 linhas volta sem erro. Sem
      // conferir as linhas afetadas o hook anunciava "aprovacao registrada" e a
      // solicitacao ficava parada na etapa (mesmo padrao de useSolicitacoes).
      const { data: stepAtualizado, error: updateError } = await supabase.from('approval_steps').update({
        status: 'approved', aprovador_efetivo_id: user?.id, comentario,
        decidido_em: new Date().toISOString(),
      }).eq('id', stepId).eq('status', 'pending').eq('etapa', workflow.etapa_atual).select('id');
      if (updateError) throw updateError;
      if (!stepAtualizado?.length) {
        logger.error('Aprovacao nao gravada: 0 linhas afetadas (RLS)', { stepId });
        toast.error('Aprovação não gravada: você não tem permissão para aprovar esta etapa.');
        return false;
      }

      const { data: allSteps } = await supabase.from('approval_steps').select('*').eq('workflow_id', step.workflow_id);
      const allOtherSteps = allSteps?.filter(s => s.id !== stepId) || [];
      const aindaPendentes = allOtherSteps.filter(s => s.status === 'pending');
      const allApproved = aindaPendentes.length === 0
        && allOtherSteps.every(s => s.status === 'approved' || s.status === 'skipped');

      if (allApproved) {
        const { data: current } = await supabase.from('approval_workflows').select('status').eq('id', step.workflow_id).single();
        if (current?.status === 'pending') {
          await supabase.from('approval_workflows').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', step.workflow_id);
          toast.success('Aprovação finalizada! Solicitação liberada.');
        }
      } else {
        // Concluir so quando nao sobrar nenhuma etapa pendente: a busca para frente
        // escondia as pendentes anteriores e fechava o fluxo antes do fim.
        const nextStep = aindaPendentes
          .filter(s => s.etapa > step.etapa)
          .sort((a, b) => a.etapa - b.etapa)[0];
        if (nextStep) {
          await supabase.from('approval_workflows').update({ etapa_atual: nextStep.etapa, updated_at: new Date().toISOString() }).eq('id', step.workflow_id);
        }
      }

      await supabase.from('approval_history').insert({
        workflow_id: step.workflow_id, step_id: stepId, acao: 'approved',
        usuario_id: user?.id, usuario_nome: user?.email, detalhes: { comentario },
      });
      toast.success('Aprovação registrada com sucesso');
      await fetchPendingSteps();
      await fetchPendingWorkflows();
      return true;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error approving step', { error });
      if (!fromDLQ) {
        pushToDLQ('approve_step', { stepId, comentario, userId: user?.id }, errMsg);
        toast.error('Erro ao aprovar — salvo para reprocessamento');
      }
      return false;
    } finally { setLoading(false); }
  }, [user, fetchPendingSteps, fetchPendingWorkflows, pushToDLQ]);

  const rejectStep = useCallback(async (stepId: string, comentario: string, fromDLQ = false): Promise<boolean> => {
    try {
      setLoading(true);
      const { data: step, error: stepError } = await supabase.from('approval_steps')
        .select('*').eq('id', stepId).single();
      if (stepError) throw stepError;

      const { data: stepRejeitado, error: rejectUpdateError } = await supabase.from('approval_steps').update({
        status: 'rejected', aprovador_efetivo_id: user?.id, comentario,
        decidido_em: new Date().toISOString(),
      }).eq('id', stepId).select('id');
      if (rejectUpdateError) throw rejectUpdateError;
      if (!stepRejeitado?.length) {
        logger.error('Rejeicao nao gravada: 0 linhas afetadas (RLS)', { stepId });
        toast.error('Rejeição não gravada: você não tem permissão para rejeitar esta etapa.');
        return false;
      }
      await supabase.from('approval_workflows').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', step.workflow_id);
      await supabase.from('approval_steps').update({ status: 'skipped', comentario: 'Workflow rejected at previous step' })
        .eq('workflow_id', step.workflow_id).eq('status', 'pending');
      // O trigger do banco só promove para 'aprovada' quando o workflow é aprovado;
      // sem este update a solicitação ficaria 'pendente' para sempre após uma rejeição.
      const { data: workflow } = await supabase.from('approval_workflows')
        .select('solicitacao_id').eq('id', step.workflow_id).single();
      if (workflow?.solicitacao_id) {
        // Mesma armadilha da etapa: a solicitacao tem RLS propria, entao o update
        // pode casar 0 linhas e voltar sem erro — a etapa ficava 'rejected' e a
        // solicitacao seguia 'pendente' para sempre, sem ninguem saber.
        const { data: solicitacaoRejeitada, error: erroRejeicao } = await supabase.from('solicitacoes')
          .update({ status: 'rejeitada', updated_at: new Date().toISOString() })
          .eq('id', workflow.solicitacao_id)
          .in('status', ['pendente', 'em_cotacao'])
          .select('id');
        if (erroRejeicao) throw erroRejeicao;
        if (!solicitacaoRejeitada?.length) {
          // 0 linhas tambem e o resultado normal quando a solicitacao ja nao esta
          // pendente (ex.: rejeitada antes). So alarmar se o estado final estiver errado.
          const { data: atual } = await supabase.from('solicitacoes')
            .select('status').eq('id', workflow.solicitacao_id).single();
          if (atual?.status !== 'rejeitada') {
            logger.error('Solicitacao nao marcada como rejeitada (RLS)', {
              solicitacaoId: workflow.solicitacao_id, statusAtual: atual?.status,
            });
            toast.error('Etapa rejeitada, mas a solicitação não foi marcada como rejeitada: você não tem permissão para alterar esta solicitação.');
            await fetchPendingSteps();
            await fetchPendingWorkflows();
            return false;
          }
        }
      }
      await supabase.from('approval_history').insert({
        workflow_id: step.workflow_id, step_id: stepId, acao: 'rejected',
        usuario_id: user?.id, usuario_nome: user?.email, detalhes: { comentario },
      });
      toast.success('Rejeição registrada');
      await fetchPendingSteps();
      await fetchPendingWorkflows();
      return true;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error rejecting step', { error });
      if (!fromDLQ) {
        pushToDLQ('reject_step', { stepId, comentario, userId: user?.id }, errMsg);
        toast.error('Erro ao rejeitar — salvo para reprocessamento');
      }
      return false;
    } finally { setLoading(false); }
  }, [user, fetchPendingSteps, fetchPendingWorkflows, pushToDLQ]);

  // ── Dead-letter queue retry ─────────────────────────────────────────────
  // Re-dispatches a stored DLQ operation through the real action. Uses
  // retryEntry's handler contract so success removes the entry and a failure
  // increments retryCount/backoff (see useWorkflowDLQ).
  const retryDLQEntry = useCallback(async (entryId: string): Promise<boolean> => {
    const entries = dlqEntries;
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return false;

    const handler = async (payload: Record<string, unknown>): Promise<boolean> => {
      switch (entry.type) {
        case 'approve_step': {
          const stepId = String(payload.stepId ?? '');
          return approveStep(stepId, typeof payload.comentario === 'string' ? payload.comentario : undefined, true);
        }
        case 'reject_step': {
          const stepId = String(payload.stepId ?? '');
          return rejectStep(stepId, typeof payload.comentario === 'string' ? payload.comentario : '', true);
        }
        case 'create_workflow': {
          const solicitacaoId = String(payload.solicitacaoId ?? '');
          const valor = typeof payload.valor === 'number' ? payload.valor : 0;
          const categoriaId = typeof payload.categoriaId === 'string' ? payload.categoriaId : undefined;
          const result = await createWorkflow(solicitacaoId, valor, categoriaId, true);
          return result !== null;
        }
        default:
          return false;
      }
    };

    return retryEntry(entryId, handler);
  }, [dlqEntries, retryEntry, approveStep, rejectStep, createWorkflow]);

  // ── Escalation polling (local UX guard — server cron is the real enforcer) ─

  const checkEscalations = useCallback(async () => {
      if (!organizationId) return;
    try {
        const { data: overdue, error: overdueError } = await supabase.from('approval_workflows')
        .select('*, approval_rules(*)')
        .eq('status', 'pending')
        .lt('prazo_limite', new Date().toISOString())
        .is('escalado_em', null);
        if (overdueError) throw overdueError;
      if (!overdue?.length) return;
      for (const wf of overdue) {
        const rule = wf.approval_rules;
        if (!rule?.escalacao_automatica || !rule?.escalacao_para) continue;
          // Só escala quem ainda não foi escalado: dois navegadores abertos rodam este
          // polling e o UPDATE cego criava duas etapas para o mesmo aprovador.
          const { data: escalados, error: escalateError } = await supabase.from('approval_workflows').update({
          status: 'escalated', escalado_em: new Date().toISOString(), escalado_para: rule.escalacao_para,
          }).eq('id', wf.id).is('escalado_em', null).select('id');
          if (escalateError) throw escalateError;
          if (!escalados?.length) continue;
        await supabase.from('approval_steps').insert({
          workflow_id: wf.id, etapa: wf.etapa_atual + 1, aprovador_id: rule.escalacao_para,
            // Sem organization_id a etapa nasce invisível: fetchPendingSteps filtra por ele.
            organization_id: organizationId,
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
    }, [fetchPendingWorkflows, fetchPendingSteps, organizationId]);

  // ── Bootstrap ────────────────────────────────────────────────────────────

  useEffect(() => {
    void Promise.all([
      fetchRulesRef.current(),
      fetchDelegationsRef.current(),
      fetchPendingWorkflows(),
      fetchPendingSteps(),
      fetchAllWorkflows(),
      fetchAllSteps(),
    ]);
  }, [fetchPendingWorkflows, fetchPendingSteps, fetchAllWorkflows, fetchAllSteps]);

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
    allWorkflows,
    allSteps,
    allHistory: historyApi.allHistory,
    loading: loading || rulesApi.loading || fetching,
    error: fetchError,
    // Fetches
    fetchRules: rulesApi.fetchRules,
    fetchDelegations: rulesApi.fetchDelegations,
    fetchPendingWorkflows,
    fetchPendingSteps,
    fetchAllWorkflows,
    fetchAllSteps,
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
    retryDLQEntry,
  };
};
