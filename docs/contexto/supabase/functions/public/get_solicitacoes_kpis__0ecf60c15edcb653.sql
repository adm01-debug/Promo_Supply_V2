CREATE OR REPLACE FUNCTION public.get_solicitacoes_kpis(p_organization_id uuid)
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
        'pendentes', COUNT(*) FILTER (WHERE status = 'pendente'),
        'emCotacao', COUNT(*) FILTER (WHERE status = 'em_cotacao'),
        'aprovadas', COUNT(*) FILTER (WHERE status = 'aprovada'),
        'concluidas', COUNT(*) FILTER (WHERE status = 'concluida'),
        'valorTotal', COALESCE(SUM(valor_estimado), 0)
    ) INTO result
    FROM solicitacoes
    WHERE organization_id = p_organization_id;

    RETURN result;
END;
$function$
