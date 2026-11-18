CREATE OR REPLACE FUNCTION public.check_escalation()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_workflow RECORD;
  v_rule RECORD;
BEGIN
  -- Find workflows that need escalation
  FOR v_workflow IN
    SELECT w.*, r.escalacao_para, r.tempo_limite_horas
    FROM public.approval_workflows w
    JOIN public.approval_rules r ON r.id = w.rule_id
    WHERE w.status = 'pending'
      AND r.escalacao_automatica = true
      AND w.prazo_limite < now()
      AND w.escalado_em IS NULL
  LOOP
    -- Update workflow as escalated
    UPDATE public.approval_workflows
    SET 
      status = 'escalated',
      escalado_em = now(),
      escalado_para = v_workflow.escalacao_para,
      updated_at = now()
    WHERE id = v_workflow.id;
    
    -- Create new step for escalated approver
    INSERT INTO public.approval_steps (
      workflow_id, etapa, aprovador_id, prazo_limite
    ) VALUES (
      v_workflow.id,
      v_workflow.etapa_atual + 1,
      v_workflow.escalacao_para,
      now() + (v_workflow.tempo_limite_horas || ' hours')::interval
    );
    
    -- Log escalation
    INSERT INTO public.approval_history (
      workflow_id, solicitacao_id, acao, detalhes
    ) VALUES (
      v_workflow.id,
      v_workflow.solicitacao_id,
      'escalated',
      jsonb_build_object('escalado_para', v_workflow.escalacao_para, 'motivo', 'Prazo expirado')
    );
  END LOOP;
END;
$function$
