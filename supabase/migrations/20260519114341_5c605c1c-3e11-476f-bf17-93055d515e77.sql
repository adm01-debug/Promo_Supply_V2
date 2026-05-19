-- Function to get Pedidos KPIs efficiently
CREATE OR REPLACE FUNCTION public.get_pedidos_kpis(p_organization_id UUID)
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
        'pendentes', COUNT(*) FILTER (WHERE status IN ('pendente', 'aprovado')),
        'emTransito', COUNT(*) FILTER (WHERE status IN ('em_transito', 'enviado')),
        'entregues', COUNT(*) FILTER (WHERE status = 'entregue'),
        'valorTotal', COALESCE(SUM(valor_total), 0)
    ) INTO result
    FROM pedidos
    WHERE organization_id = p_organization_id;

    RETURN result;
END;
$$;

-- Function to get Solicitacoes KPIs efficiently
CREATE OR REPLACE FUNCTION public.get_solicitacoes_kpis(p_organization_id UUID)
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
$$;

-- Revoke execution from public
REVOKE EXECUTE ON FUNCTION public.get_pedidos_kpis(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_solicitacoes_kpis(UUID) FROM public;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_pedidos_kpis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_solicitacoes_kpis(UUID) TO authenticated;
