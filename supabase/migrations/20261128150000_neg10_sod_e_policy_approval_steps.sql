-- security(banco): decisão de etapa de aprovação passa a exigir etapa corrente, workflow
-- pendente e segregação de função; check_workflow_sod volta a rodar.
--
-- Etapa 093 / achado NEG-10 (parte 1 de 2). A parte de aplicação é a etapa 094
-- (useApprovalWorkflow.approveStep já condiciona o UPDATE a status='pending' e à etapa
-- corrente). Aqui o mesmo limite vira regra de banco, porque o PostgREST é alcançável
-- direto: o front não é a única porta para o UPDATE.
--
-- (a) approval_steps: a policy permissiva "Approvers can update their steps"
--     (20260111025047:135-137) nasceu sem WITH CHECK e nunca foi alterada. Sem WITH CHECK
--     o Postgres reaproveita o USING, mas isso só decide QUAIS linhas o aprovador enxerga:
--     ele continuava livre para gravar status='approved' em qualquer etapa (inclusive na
--     última, fechando o workflow com as anteriores pendentes), para trocar 'etapa' e
--     'workflow_id' e para aprovar a própria solicitação. A policy é recriada com USING
--     (linha pendente do próprio aprovador) + WITH CHECK (só approved/rejected, workflow
--     ainda pendente, etapa corrente e aprovador diferente do solicitante). As policies
--     permissivas de admin/coordinator continuam valendo para eles: quem administra segue
--     podendo corrigir etapa já decidida.
-- (b) trigger: 'workflow_id', 'etapa' e 'aprovador_id' passam a ser imutáveis e uma etapa
--     já decidida não volta a ser decidida. O WITH CHECK não enxerga o valor antigo (nele
--     toda coluna resolve para o NEW), então imutabilidade de identidade só é expressável
--     em gatilho. O gatilho também roda para service_role, que é o caminho do cron
--     check-approval-escalations (marca a etapa vencida como 'skipped' e preenche
--     lembrete_enviado): as duas transições continuam permitidas.
-- (c) check_workflow_sod: a função consultava public.purchase_orders.created_by (tabela
--     inexistente) e, depois de 20260521142029:177, public.pedidos.created_by - coluna que
--     pedidos nunca teve (20251220181110:200-235 cria a tabela com comprador_id/aprovador_id
--     e nenhuma migration posterior adiciona created_by). Toda chamada morria com 42703
--     antes de decidir qualquer coisa, então submit_decision (workflow-engine/index.ts:142)
--     respondia erro em toda decisão de nó do workflow. O dono do pedido passa a ser o
--     solicitante da solicitação de origem e, quando não há solicitação vinculada, o
--     comprador do pedido.
--
-- Idempotente: DROP ... IF EXISTS / CREATE OR REPLACE antes de cada objeto.

-- ───────────────────── (a) policy de UPDATE do aprovador ─────────────────────

CREATE OR REPLACE FUNCTION public.aprovador_pode_decidir_etapa(
  p_workflow_id UUID,
  p_etapa INTEGER,
  p_status TEXT,
  p_aprovador_id UUID,
  p_aprovador_efetivo_id UUID,
  p_uid UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN p_uid IS NULL THEN FALSE
    WHEN p_status NOT IN ('approved', 'rejected') THEN FALSE
    WHEN NOT (
      p_uid = p_aprovador_id
      OR p_uid = p_aprovador_efetivo_id
      OR public.has_role(p_uid, 'admin'::app_role)
      OR public.has_role(p_uid, 'coordinator'::app_role)
    ) THEN FALSE
    ELSE EXISTS (
      SELECT 1
        FROM public.approval_workflows w
        LEFT JOIN public.solicitacoes s ON s.id = w.solicitacao_id
       WHERE w.id = p_workflow_id
         AND w.status = 'pending'
         AND (p_status <> 'approved' OR w.etapa_atual = p_etapa)
         AND (p_status <> 'approved' OR s.solicitante_id IS NULL OR s.solicitante_id <> p_uid)
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.aprovador_pode_decidir_etapa(UUID, INTEGER, TEXT, UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprovador_pode_decidir_etapa(UUID, INTEGER, TEXT, UUID, UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Approvers can update their steps" ON public.approval_steps;
CREATE POLICY "approval_steps_aprovador_decide_etapa" ON public.approval_steps
  FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND (
      auth.uid() = aprovador_id
      OR auth.uid() = aprovador_efetivo_id
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'coordinator'::app_role)
    )
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
    AND public.aprovador_pode_decidir_etapa(
      workflow_id, etapa, status, aprovador_id, aprovador_efetivo_id, auth.uid()
    )
  );

-- ───────────────────── (b) identidade da etapa é imutável ─────────────────────

CREATE OR REPLACE FUNCTION public.validar_decisao_approval_step()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.workflow_id IS DISTINCT FROM OLD.workflow_id
     OR NEW.etapa IS DISTINCT FROM OLD.etapa
     OR NEW.aprovador_id IS DISTINCT FROM OLD.aprovador_id THEN
    RAISE EXCEPTION 'approval_steps: workflow_id, etapa e aprovador_id sao imutaveis (etapa %)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'approval_steps: etapa % ja decidida (status %) nao pode virar %', OLD.id, OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status NOT IN ('approved', 'rejected', 'skipped') THEN
      RAISE EXCEPTION 'approval_steps: status % invalido para a etapa %', NEW.status, OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_decisao_approval_step() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_approval_steps_decisao ON public.approval_steps;
CREATE TRIGGER trg_approval_steps_decisao
  BEFORE UPDATE ON public.approval_steps
  FOR EACH ROW EXECUTE FUNCTION public.validar_decisao_approval_step();

-- ───────────────────── (c) check_workflow_sod com as colunas reais ─────────────────────

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
  v_entity_type TEXT;
  v_creator_id UUID;
  v_previous_approver_id UUID;
BEGIN
  -- entity_type diz qual tabela guarda o dono da entidade; a instância é a fonte dele
  -- (o payload traz entity_id, nem sempre o tipo).
  SELECT entity_type INTO v_entity_type
    FROM public.workflow_instances
   WHERE id = p_instance_id;

  IF v_entity_type IS NULL OR v_entity_type = 'pedido' THEN
    SELECT COALESCE(s.solicitante_id, p.comprador_id) INTO v_creator_id
      FROM public.pedidos p
      LEFT JOIN public.solicitacoes s ON s.id = p.solicitacao_id
     WHERE p.id = p_entity_id;
  END IF;

  IF v_creator_id IS NULL THEN
    SELECT s.solicitante_id INTO v_creator_id
      FROM public.solicitacoes s
     WHERE s.id = p_entity_id;
  END IF;

  IF v_creator_id IS NOT NULL AND v_creator_id = p_approver_id THEN
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