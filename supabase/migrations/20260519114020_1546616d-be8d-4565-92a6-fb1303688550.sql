CREATE OR REPLACE FUNCTION public.get_compras_dashboard_metrics(
    p_organization_id UUID,
    p_period TEXT DEFAULT '6m',
    p_category_id UUID DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_start_date TIMESTAMP WITH TIME ZONE;
    v_current_month_start TIMESTAMP WITH TIME ZONE := date_trunc('month', NOW());
    v_prev_month_start TIMESTAMP WITH TIME ZONE := date_trunc('month', NOW() - INTERVAL '1 month');
    v_prev_month_end TIMESTAMP WITH TIME ZONE := (date_trunc('month', NOW()) - INTERVAL '1 second');
    
    v_kpis JSONB;
    v_pipeline JSONB;
    v_trends JSONB;
    v_top_categories JSONB;
    v_urgent_items JSONB;
    v_cotacao_status JSONB;
BEGIN
    -- Determine start date based on period
    IF p_period = '1m' THEN v_start_date := v_now - INTERVAL '1 month';
    ELSIF p_period = '3m' THEN v_start_date := v_now - INTERVAL '3 months';
    ELSIF p_period = '1y' THEN v_start_date := v_now - INTERVAL '1 year';
    ELSE v_start_date := v_now - INTERVAL '6 months';
    END IF;

    -- 1. Summary KPIs and Comparisons
    WITH current_period AS (
        SELECT 
            COUNT(*) FILTER (WHERE status IN ('pendente', 'em_cotacao')) as aguardando,
            COALESCE(SUM(valor_total) FILTER (WHERE data_emissao >= v_current_month_start), 0) as volume,
            COALESCE(SUM(valor_estimado - valor_aprovado) FILTER (WHERE valor_estimado > valor_aprovado AND created_at >= v_current_month_start), 0) as economia
        FROM solicitacoes s
        LEFT JOIN pedidos p ON p.solicitacao_id = s.id
        WHERE s.organization_id = p_organization_id
        AND (p_category_id IS NULL OR s.categoria_id = p_category_id)
        AND (p_supplier_id IS NULL OR s.fornecedor_id = p_supplier_id)
    ),
    prev_period AS (
        SELECT 
            COUNT(*) FILTER (WHERE status IN ('pendente', 'em_cotacao')) as aguardando,
            COALESCE(SUM(valor_total), 0) as volume,
            COALESCE(SUM(valor_estimado - valor_aprovado) FILTER (WHERE valor_estimado > valor_aprovado), 0) as economia
        FROM solicitacoes s
        LEFT JOIN pedidos p ON p.solicitacao_id = s.id
        WHERE s.organization_id = p_organization_id
        AND s.created_at BETWEEN v_prev_month_start AND v_prev_month_end
        AND (p_category_id IS NULL OR s.categoria_id = p_category_id)
        AND (p_supplier_id IS NULL OR s.fornecedor_id = p_supplier_id)
    )
    SELECT jsonb_build_object(
        'aguardando', jsonb_build_object('current', cp.aguardando, 'previous', pp.aguardando),
        'volume', jsonb_build_object('current', cp.volume, 'previous', pp.volume),
        'economia', jsonb_build_object('current', cp.economia, 'previous', pp.economia)
    ) INTO v_kpis
    FROM current_period cp, prev_period pp;

    -- 2. Pipeline
    SELECT jsonb_build_object(
        'solicitacao', COUNT(*) FILTER (WHERE status IN ('pendente', 'em_cotacao')),
        'cotacao', COUNT(*) FILTER (WHERE status IN ('em_cotacao', 'aprovada')),
        'pedido', (SELECT COUNT(*) FROM pedidos WHERE organization_id = p_organization_id AND status IN ('pendente', 'aprovado')),
        'pagamento', (SELECT COUNT(*) FROM pagamentos WHERE organization_id = p_organization_id AND status IN ('pendente', 'aprovado', 'agendado')),
        'transito', (SELECT COUNT(*) FROM pedidos WHERE organization_id = p_organization_id AND status IN ('enviado', 'em_transito')),
        'entregue', (SELECT COUNT(*) FROM pedidos WHERE organization_id = p_organization_id AND status = 'entregue')
    ) INTO v_pipeline
    FROM solicitacoes
    WHERE organization_id = p_organization_id;

    -- 3. Monthly Trends (last 6 months)
    SELECT jsonb_agg(t) INTO v_trends
    FROM (
        SELECT 
            to_char(m.month, 'Mon') as month,
            COUNT(p.id) as pedidos,
            COUNT(c.id) as cotacoes,
            COALESCE(SUM(s.valor_estimado - s.valor_aprovado) FILTER (WHERE s.valor_estimado > s.valor_aprovado), 0) as economia
        FROM generate_series(v_now - INTERVAL '5 months', v_now, '1 month') m(month)
        LEFT JOIN solicitacoes s ON date_trunc('month', s.created_at) = date_trunc('month', m.month) AND s.organization_id = p_organization_id
        LEFT JOIN pedidos p ON p.solicitacao_id = s.id
        LEFT JOIN cotacoes c ON c.solicitacao_id = s.id
        GROUP BY m.month
        ORDER BY m.month
    ) t;

    -- 4. Top Categories
    SELECT jsonb_agg(t) INTO v_top_categories
    FROM (
        SELECT 
            cat.nome as name,
            SUM(p.valor_total) as value,
            ROUND(100.0 * SUM(p.valor_total) / NULLIF(SUM(SUM(p.valor_total)) OVER(), 0), 1) as percentage
        FROM pedidos p
        JOIN solicitacoes s ON p.solicitacao_id = s.id
        JOIN categorias cat ON s.categoria_id = cat.id
        WHERE s.organization_id = p_organization_id
        GROUP BY cat.nome
        ORDER BY value DESC
        LIMIT 5
    ) t;

    -- 5. Urgent Items
    SELECT jsonb_agg(t) INTO v_urgent_items
    FROM (
        SELECT 
            id,
            numero,
            titulo,
            status,
            data_necessidade,
            'alto' as urgencia
        FROM solicitacoes
        WHERE organization_id = p_organization_id
        AND status IN ('pendente', 'em_cotacao')
        AND (data_necessidade IS NULL OR data_necessidade <= (v_now + INTERVAL '7 days'))
        ORDER BY data_necessidade ASC NULLS LAST
        LIMIT 5
    ) t;

    -- 6. Cotacao Status
    SELECT jsonb_agg(t) INTO v_cotacao_status
    FROM (
        SELECT 
            status as name,
            COUNT(*) as value,
            CASE 
                WHEN status = 'pendente' THEN '#f59e0b'
                WHEN status = 'enviada' THEN '#3b82f6'
                WHEN status = 'em_analise' THEN '#8b5cf6'
                WHEN status = 'selecionada' THEN '#10b981'
                ELSE '#94a3b8'
            END as color
        FROM cotacoes
        WHERE organization_id = p_organization_id
        GROUP BY status
    ) t;

    RETURN jsonb_build_object(
        'kpis', v_kpis,
        'pipeline', v_pipeline,
        'trends', v_trends,
        'topCategories', COALESCE(v_top_categories, '[]'::jsonb),
        'urgentItems', COALESCE(v_urgent_items, '[]'::jsonb),
        'cotacaoStatus', COALESCE(v_cotacao_status, '[]'::jsonb)
    );
END;
$$;

-- Revoke and Grant
REVOKE EXECUTE ON FUNCTION public.get_compras_dashboard_metrics(UUID, TEXT, UUID, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_compras_dashboard_metrics(UUID, TEXT, UUID, UUID) TO authenticated;
