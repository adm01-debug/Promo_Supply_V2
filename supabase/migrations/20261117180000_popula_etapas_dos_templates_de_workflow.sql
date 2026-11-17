-- WF-01: popula as etapas (nodes) e as conexoes (edges) dos templates de workflow.
-- Causa: os templates foram semeados apenas com config.steps (descricao declarativa),
-- mas workflow_nodes e workflow_edges ficaram vazias. A edge function workflow-engine
-- busca o node de tipo start com .single() e falha com PGRST116, derrubando a acao
-- start_workflow para todos os templates.
-- Idempotente: so gera o grafo de templates que ainda nao tem nenhum node.
-- Templates cujo tenant_id nao existe em public.tenants sao ignorados: workflow_nodes
-- tem FK para tenants, entao inserir para eles violaria a restricao.

DO $mig$
DECLARE
  tpl         RECORD;
  steps       jsonb;
  step        jsonb;
  idx         int;
  prev_id     uuid;
  cur_id      uuid;
  end_id      uuid;
  node_type   public.workflow_node_type;
  node_label  text;
  step_role   text;
  step_action text;
  y           int;
BEGIN
  FOR tpl IN
    SELECT t.id, t.tenant_id, t.name, t.config
    FROM public.workflow_templates t
    JOIN public.tenants tn ON tn.id = t.tenant_id
    ORDER BY t.created_at
  LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.workflow_nodes WHERE template_id = tpl.id);

    steps := COALESCE(tpl.config -> 'steps', '[]'::jsonb);
    IF jsonb_typeof(steps) <> 'array' OR jsonb_array_length(steps) = 0 THEN
      -- Template sem etapas declaradas: fluxo minimo de uma aprovacao administrativa.
      steps := '[{"role":"admin","action":"approve","sla_hours":24}]'::jsonb;
    END IF;

    INSERT INTO public.workflow_nodes (template_id, tenant_id, type, label, config, position_x, position_y)
    VALUES (tpl.id, tpl.tenant_id, 'start', 'Inicio', '{}'::jsonb, 0, 0)
    RETURNING id INTO prev_id;

    y := 0;

    FOR idx IN 0 .. jsonb_array_length(steps) - 1 LOOP
      step        := steps -> idx;
      step_role   := COALESCE(step ->> 'role', 'admin');
      step_action := COALESCE(step ->> 'action', 'approve');
      y           := y + 140;

      IF step_action = 'submit' THEN
        node_type  := 'action';
        node_label := 'Envio pelo solicitante';
      ELSIF step_action = 'review' THEN
        node_type  := 'approval';
        node_label := 'Analise - ' || step_role;
      ELSE
        node_type  := 'approval';
        node_label := 'Aprovacao - ' || step_role;
      END IF;

      INSERT INTO public.workflow_nodes (template_id, tenant_id, type, label, config, position_x, position_y)
      VALUES (
        tpl.id, tpl.tenant_id, node_type, node_label,
        jsonb_strip_nulls(jsonb_build_object(
          'role',      step_role,
          'action',    step_action,
          'sla_hours', step -> 'sla_hours',
          'urgent',    step -> 'urgent'
        )),
        0, y
      )
      RETURNING id INTO cur_id;

      INSERT INTO public.workflow_edges (template_id, tenant_id, source_node_id, target_node_id)
      VALUES (tpl.id, tpl.tenant_id, prev_id, cur_id);

      prev_id := cur_id;
    END LOOP;

    INSERT INTO public.workflow_nodes (template_id, tenant_id, type, label, config, position_x, position_y)
    VALUES (tpl.id, tpl.tenant_id, 'end', 'Fim', '{}'::jsonb, 0, y + 140)
    RETURNING id INTO end_id;

    INSERT INTO public.workflow_edges (template_id, tenant_id, source_node_id, target_node_id)
    VALUES (tpl.id, tpl.tenant_id, prev_id, end_id);
  END LOOP;
END $mig$;