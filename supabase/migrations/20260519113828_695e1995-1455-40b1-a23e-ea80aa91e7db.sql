-- Function to get Pagamentos KPIs efficiently
CREATE OR REPLACE FUNCTION public.get_pagamentos_kpis(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    v_hoje DATE := CURRENT_DATE;
BEGIN
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
$$;

-- Function to get Fornecedores KPIs efficiently
CREATE OR REPLACE FUNCTION public.get_fornecedores_kpis(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
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
$$;
