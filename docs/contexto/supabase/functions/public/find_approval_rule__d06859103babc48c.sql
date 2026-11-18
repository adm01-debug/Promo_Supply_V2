CREATE OR REPLACE FUNCTION public.find_approval_rule(p_valor numeric, p_categoria_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rule_id UUID;
BEGIN
  SELECT id INTO v_rule_id
  FROM public.approval_rules
  WHERE ativo = true
    AND p_valor >= valor_min
    AND p_valor <= valor_max
    AND (categoria_id IS NULL OR categoria_id = p_categoria_id)
  ORDER BY 
    CASE WHEN categoria_id IS NOT NULL THEN 0 ELSE 1 END, -- Prefer category-specific rules
    prioridade DESC,
    valor_min DESC
  LIMIT 1;
  
  RETURN v_rule_id;
END;
$function$
