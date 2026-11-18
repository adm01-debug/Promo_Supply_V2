CREATE OR REPLACE FUNCTION public.get_pagamentos_kpis(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
    v_hoje DATE := CURRENT_DATE;
BEGIN
    IF p_organization_id IS DISTINCT FROM public.get_user_grupo_id() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'total', COUNT(*),
        'pendentes', COUNT(*) FILTER (WHERE status IN ('pendente', 'aprovado', 'agendado')),
        'atrasados', COUNT(*) FILTER (WHERE status IN ('pendente', 'aprovado') AND data_vencimento < v_hoje),
        'pagos', COUNT(*) FILTER (WHERE status = 'pago'),
        'valorPendente', COALESCE(SUM(valor - COALESCE(valor_pago, 0)) FILTER (WHERE status NOT IN ('pago', 'cancelado')), 0),
        'valorPago', COALESCE(SUM(valor) FILTER (WHERE status = 'pago'), 0)
    ) INTO result
    FROM pagamentos
    WHERE organization_id = p_organization_id;

    RETURN result;
END;
$function$
