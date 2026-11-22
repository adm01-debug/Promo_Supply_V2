CREATE OR REPLACE FUNCTION public.get_compras_sla_metrics(p_organization_id uuid, p_period text DEFAULT '6m'::text, p_category_id uuid DEFAULT NULL::uuid, p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_interval INTERVAL;
    v_start_date TIMESTAMPTZ;
    v_prev_start TIMESTAMPTZ;
    v_sla JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;

    IF p_organization_id IS DISTINCT FROM public.get_user_grupo_id() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    v_interval := CASE p_period
        WHEN '1m' THEN INTERVAL '1 month'
        WHEN '3m' THEN INTERVAL '3 months'
        WHEN '1y' THEN INTERVAL '1 year'
        ELSE INTERVAL '6 months'
    END;
    v_start_date := date_trunc('day', v_now) - v_interval;
    v_prev_start := v_start_date - v_interval;

    WITH base AS (
        SELECT
            GREATEST(p.data_entrega - s.data_necessidade, 0) AS dias_atraso,
            p.data_entrega >= v_start_date::date AS na_janela
        FROM pedidos p
        JOIN solicitacoes s ON s.id = p.solicitacao_id
        WHERE p.organization_id = p_organization_id
          AND p.status IN ('entregue', 'parcial')
          AND p.data_entrega IS NOT NULL
          AND s.data_necessidade IS NOT NULL
          AND p.data_entrega >= v_prev_start::date
          AND p.data_entrega <= v_now::date
          AND (p_supplier_id IS NULL OR p.fornecedor_id = p_supplier_id)
          AND (p_category_id IS NULL OR s.categoria_id = p_category_id)
    )
    SELECT jsonb_build_object(
        'avgSla', ROUND(COALESCE(AVG(dias_atraso) FILTER (WHERE na_janela), 0)::numeric, 2),
        'taxaSlaReal', ROUND(COALESCE(
            100.0 * COUNT(*) FILTER (WHERE na_janela AND dias_atraso = 0)
                  / NULLIF(COUNT(*) FILTER (WHERE na_janela), 0), 0)::numeric, 1),
        'previousAvgSla', ROUND(COALESCE(AVG(dias_atraso) FILTER (WHERE NOT na_janela), 0)::numeric, 2),
        'previousTaxaSlaReal', ROUND(COALESCE(
            100.0 * COUNT(*) FILTER (WHERE NOT na_janela AND dias_atraso = 0)
                  / NULLIF(COUNT(*) FILTER (WHERE NOT na_janela), 0), 0)::numeric, 1),
        'amostra', COUNT(*) FILTER (WHERE na_janela),
        'amostraAnterior', COUNT(*) FILTER (WHERE NOT na_janela)
    ) INTO v_sla
    FROM base;

    RETURN v_sla;
END;
$function$
