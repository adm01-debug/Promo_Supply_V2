CREATE OR REPLACE FUNCTION public.get_fornecedores_kpis(p_organization_id uuid)
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
        'ativos', COUNT(*) FILTER (WHERE status = 'ativo'),
        'integradosApi', COUNT(*) FILTER (WHERE integrado_api = true),
        'mediaAvaliacao', COALESCE(AVG(avaliacao), 0)
    ) INTO result
    FROM fornecedores
    WHERE organization_id = p_organization_id;

    RETURN result;
END;
$function$
