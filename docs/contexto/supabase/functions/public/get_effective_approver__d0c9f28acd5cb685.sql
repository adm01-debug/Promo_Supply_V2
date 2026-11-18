CREATE OR REPLACE FUNCTION public.get_effective_approver(p_approver_id uuid, p_categoria_id uuid DEFAULT NULL::uuid, p_valor numeric DEFAULT NULL::numeric)
 RETURNS TABLE(approver_id uuid, delegation_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(d.delegado_id, p_approver_id) as approver_id,
    d.id as delegation_id
  FROM (SELECT p_approver_id as uid) base
  LEFT JOIN public.approval_delegations d ON 
    d.delegante_id = p_approver_id
    AND d.ativo = true
    AND now() BETWEEN d.data_inicio AND d.data_fim
    AND (d.categorias_permitidas = '[]'::jsonb OR p_categoria_id IS NULL OR d.categorias_permitidas @> to_jsonb(p_categoria_id))
    AND (d.valor_maximo IS NULL OR p_valor IS NULL OR p_valor <= d.valor_maximo)
  ORDER BY d.created_at DESC
  LIMIT 1;
END;
$function$
