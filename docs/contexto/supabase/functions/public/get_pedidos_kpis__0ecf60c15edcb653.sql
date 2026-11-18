CREATE OR REPLACE FUNCTION public.get_pedidos_kpis(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
BEGIN
    IF p_organization_id IS DISTINCT FROM public.get_user_grupo_id() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'total', COUNT(*),
        'pendentes', COUNT(*) FILTER (WHERE status IN ('pendente', 'aprovado')),
        'emTransito', COUNT(*) FILTER (WHERE status IN ('em_transito', 'enviado')),
        'entregues', COUNT(*) FILTER (WHERE status = 'entregue'),
        'valorTotal', COALESCE(SUM(valor_total), 0)
    ) INTO result
    FROM pedidos
    WHERE organization_id = p_organization_id;

    RETURN result;
END;
$function$
