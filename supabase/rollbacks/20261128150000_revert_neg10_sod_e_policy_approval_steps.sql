-- Reversao da migration 20261128150000_neg10_sod_e_policy_approval_steps.sql (etapa 093 / NEG-10).
--
-- Volta o banco ao estado anterior: a policy permissiva "Approvers can update their steps"
-- sem WITH CHECK (20260111025047:135-137), sem o gatilho de identidade da etapa e com
-- check_workflow_sod na versao de 20260521142029 (a que consulta pedidos.created_by e
-- portanto levanta 42703 em toda chamada).
--
-- Quando usar: se o endurecimento do UPDATE de approval_steps barrar uma decisao legitima
-- que a etapa 094 nao cubra. Ler os alertas de erro de gravacao antes - o hook registra
-- "Aprovacao nao gravada: 0 linhas afetadas (RLS)" no logger quando o RLS recusa.
-- Nao e caminho de rotina.

BEGIN;

DROP TRIGGER IF EXISTS trg_approval_steps_decisao ON public.approval_steps;
DROP FUNCTION IF EXISTS public.validar_decisao_approval_step();

DROP POLICY IF EXISTS "approval_steps_aprovador_decide_etapa" ON public.approval_steps;
CREATE POLICY "Approvers can update their steps"
  ON public.approval_steps FOR UPDATE
  USING (auth.uid() = aprovador_id OR auth.uid() = aprovador_efetivo_id OR has_role(auth.uid(), 'admin'::app_role));

DROP FUNCTION IF EXISTS public.aprovador_pode_decidir_etapa(UUID, INTEGER, TEXT, UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.check_workflow_sod(
  p_instance_id UUID,
  p_approver_id UUID,
  p_entity_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_creator_id UUID;
  v_previous_approver_id UUID;
BEGIN
  SELECT created_by INTO v_creator_id
  FROM public.pedidos
  WHERE id = p_entity_id;

  IF v_creator_id = p_approver_id THEN
    RETURN FALSE;
  END IF;

  SELECT approver_id INTO v_previous_approver_id
  FROM public.workflow_approvals
  WHERE instance_id = p_instance_id
    AND approver_id = p_approver_id
    AND status = 'approved'
  LIMIT 1;

  IF v_previous_approver_id IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

COMMIT;