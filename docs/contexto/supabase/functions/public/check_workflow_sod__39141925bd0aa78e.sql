CREATE OR REPLACE FUNCTION public.check_workflow_sod(p_instance_id uuid, p_approver_id uuid, p_entity_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
