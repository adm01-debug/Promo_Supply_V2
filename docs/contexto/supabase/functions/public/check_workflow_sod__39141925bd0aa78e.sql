CREATE OR REPLACE FUNCTION public.check_workflow_sod(p_instance_id uuid, p_approver_id uuid, p_entity_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_creator_id UUID;
  v_previous_approver_id UUID;
BEGIN
  -- 1. Verifica se o aprovador é o criador da entidade (e.g., Pedido de Compra)
  -- Assumindo que a entidade tem um campo created_by
  EXECUTE format('SELECT created_by FROM public.purchase_orders WHERE id = %L', p_entity_id) INTO v_creator_id;
  
  IF v_creator_id = p_approver_id THEN
    RETURN FALSE; -- SoD Violation: Creator cannot approve their own request
  END IF;

  -- 2. Verifica se o aprovador já aprovou um passo anterior nesta mesma instância
  SELECT approver_id INTO v_previous_approver_id
  FROM public.workflow_approvals
  WHERE instance_id = p_instance_id
    AND approver_id = p_approver_id
    AND status = 'approved'
  LIMIT 1;

  IF v_previous_approver_id IS NOT NULL THEN
    RETURN FALSE; -- SoD Violation: Same person cannot approve twice in the same flow
  END IF;

  RETURN TRUE;
END;
$function$
