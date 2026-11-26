CREATE OR REPLACE FUNCTION public.aprovador_pode_decidir_etapa(p_workflow_id uuid, p_etapa integer, p_status text, p_aprovador_id uuid, p_aprovador_efetivo_id uuid, p_uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
