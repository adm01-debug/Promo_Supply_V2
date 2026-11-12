-- ============================================
-- MIGRATION: get_compras_dashboard_metrics — números sem inflar e período valendo
-- Data: 2026-11-12 · corrige 20261112171900_compras_dashboard_metrics_fix.sql
--
-- Causa (versão de 20261112171900):
--  a. kpis: solicitacoes LEFT JOIN pedidos repete a solicitação por pedido →
--     'aguardando' contava 17 linhas para 4 solicitações e 'economia' somava a
--     mesma diferença várias vezes; current usava mês corrente por data de
--     pedido/solicitação e prev filtrava só s.created_at (bases diferentes).
--  b. trends: solicitacoes × pedidos × cotacoes → produto cartesiano.
--  c. p_period: v_start_date calculado e nunca usado.
--  d. categoria/fornecedor só filtravam os kpis.
--
-- Regras desta versão:
--  - Janela atual = [início do dia de (agora - período), agora]; anterior =
--    janela de mesmo tamanho imediatamente antes. Mesma base nos dois lados.
--  - Agregações independentes: solicitações por created_at (sem JOIN), pedidos
--    por data_emissao, cotações por created_at. JOIN só com a solicitação (PK,
--    1:1) para filtrar categoria.
--  - Fornecedor: cada entidade pelo próprio fornecedor_id (solicitação,
--    pedido, cotação, pagamento). Categoria: categoria_id da solicitação.
--  - pipeline e urgentItems são retrato do estado atual (sem janela), com os
--    filtros; kpis, trends, topCategories e cotacaoStatus usam a janela.
-- Idempotente (CREATE OR REPLACE + REVOKE/GRANT).
-- ============================================

CREATE OR REPLACE FUNCTION public.get_compras_dashboard_metrics(p_organization_id uuid, p_period text DEFAULT '6m'::text, p_category_id uuid DEFAULT NULL::uuid, p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_interval INTERVAL;
    v_start_date TIMESTAMP WITH TIME ZONE;
    v_prev_start TIMESTAMP WITH TIME ZONE;

    v_kpis JSONB;
    v_pipeline JSONB;
    v_trends JSONB;
    v_top_categories JSONB;
    v_urgent_items JSONB;
    v_cotacao_status JSONB;
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

    -- 1. KPIs: atual × anterior, mesma base
    WITH sol AS (
        SELECT s.status, s.created_at, s.valor_estimado, s.valor_aprovado
        FROM solicitacoes s
        WHERE s.organization_id = p_organization_id
          AND s.created_at >= v_prev_start AND s.created_at <= v_now
          AND (p_category_id IS NULL OR s.categoria_id = p_category_id)
          AND (p_supplier_id IS NULL OR s.fornecedor_id = p_supplier_id)
    ),
    ped AS (
        SELECT p.data_emissao, p.valor_total
        FROM pedidos p
        WHERE p.organization_id = p_organization_id
          AND p.data_emissao >= v_prev_start::date AND p.data_emissao <= v_now::date
          AND (p_supplier_id IS NULL OR p.fornecedor_id = p_supplier_id)
          AND (p_category_id IS NULL OR EXISTS (
                SELECT 1 FROM solicitacoes s WHERE s.id = p.solicitacao_id AND s.categoria_id = p_category_id))
    ),
    sol_agg AS (
        SELECT
            COUNT(*) FILTER (WHERE status IN ('pendente', 'em_cotacao') AND created_at >= v_start_date) AS aguardando_cur,
            COUNT(*) FILTER (WHERE status IN ('pendente', 'em_cotacao') AND created_at < v_start_date) AS aguardando_prev,
            COALESCE(SUM(valor_estimado - valor_aprovado) FILTER (WHERE valor_estimado > valor_aprovado AND created_at >= v_start_date), 0) AS economia_cur,
            COALESCE(SUM(valor_estimado - valor_aprovado) FILTER (WHERE valor_estimado > valor_aprovado AND created_at < v_start_date), 0) AS economia_prev
        FROM sol
    ),
    ped_agg AS (
        SELECT
            COALESCE(SUM(valor_total) FILTER (WHERE data_emissao >= v_start_date::date), 0) AS volume_cur,
            COALESCE(SUM(valor_total) FILTER (WHERE data_emissao < v_start_date::date), 0) AS volume_prev
        FROM ped
    )
    SELECT jsonb_build_object(
        'aguardando', jsonb_build_object('current', sa.aguardando_cur, 'previous', sa.aguardando_prev),
        'volume', jsonb_build_object('current', pa.volume_cur, 'previous', pa.volume_prev),
        'economia', jsonb_build_object('current', sa.economia_cur, 'previous', sa.economia_prev)
    ) INTO v_kpis
    FROM sol_agg sa, ped_agg pa;

    -- 2. Pipeline (estado atual, com filtros)
    SELECT jsonb_build_object(
        'solicitacao', (SELECT COUNT(*) FROM solicitacoes s
                        WHERE s.organization_id = p_organization_id AND s.status IN ('pendente', 'em_cotacao')
                          AND (p_category_id IS NULL OR s.categoria_id = p_category_id)
                          AND (p_supplier_id IS NULL OR s.fornecedor_id = p_supplier_id)),
        'cotacao', (SELECT COUNT(*) FROM solicitacoes s
                    WHERE s.organization_id = p_organization_id AND s.status IN ('em_cotacao', 'aprovada')
                      AND (p_category_id IS NULL OR s.categoria_id = p_category_id)
                      AND (p_supplier_id IS NULL OR s.fornecedor_id = p_supplier_id)),
        'pedido', COUNT(*) FILTER (WHERE p.status IN ('pendente', 'aprovado')),
        'pagamento', (SELECT COUNT(*) FROM pagamentos pg
                      WHERE pg.organization_id = p_organization_id AND pg.status IN ('pendente', 'aprovado', 'agendado')
                        AND (p_supplier_id IS NULL OR pg.fornecedor_id = p_supplier_id)
                        AND (p_category_id IS NULL OR EXISTS (
                              SELECT 1 FROM pedidos p2 JOIN solicitacoes s ON s.id = p2.solicitacao_id
                              WHERE p2.id = pg.pedido_id AND s.categoria_id = p_category_id))),
        'transito', COUNT(*) FILTER (WHERE p.status IN ('enviado', 'em_transito')),
        'entregue', COUNT(*) FILTER (WHERE p.status = 'entregue')
    ) INTO v_pipeline
    FROM pedidos p
    WHERE p.organization_id = p_organization_id
      AND (p_supplier_id IS NULL OR p.fornecedor_id = p_supplier_id)
      AND (p_category_id IS NULL OR EXISTS (
            SELECT 1 FROM solicitacoes s WHERE s.id = p.solicitacao_id AND s.categoria_id = p_category_id));

    -- 3. Tendência mensal dentro da janela (cada série agregada à parte)
    SELECT jsonb_agg(jsonb_build_object(
               'month', to_char(m.m, 'Mon/YY'),
               'pedidos', COALESCE(pc.n, 0),
               'cotacoes', COALESCE(cc.n, 0),
               'economia', COALESCE(ec.v, 0)
           ) ORDER BY m.m) INTO v_trends
    FROM generate_series(date_trunc('month', v_start_date), date_trunc('month', v_now), INTERVAL '1 month') m(m)
    LEFT JOIN (
        SELECT date_trunc('month', p.data_emissao::timestamptz) AS m, COUNT(*) AS n
        FROM pedidos p
        WHERE p.organization_id = p_organization_id
          AND p.data_emissao >= v_start_date::date AND p.data_emissao <= v_now::date
          AND (p_supplier_id IS NULL OR p.fornecedor_id = p_supplier_id)
          AND (p_category_id IS NULL OR EXISTS (
                SELECT 1 FROM solicitacoes s WHERE s.id = p.solicitacao_id AND s.categoria_id = p_category_id))
        GROUP BY 1
    ) pc ON pc.m = m.m
    LEFT JOIN (
        SELECT date_trunc('month', c.created_at) AS m, COUNT(*) AS n
        FROM cotacoes c
        WHERE c.organization_id = p_organization_id
          AND c.created_at >= v_start_date AND c.created_at <= v_now
          AND (p_supplier_id IS NULL OR c.fornecedor_id = p_supplier_id)
          AND (p_category_id IS NULL OR EXISTS (
                SELECT 1 FROM solicitacoes s WHERE s.id = c.solicitacao_id AND s.categoria_id = p_category_id))
        GROUP BY 1
    ) cc ON cc.m = m.m
    LEFT JOIN (
        SELECT date_trunc('month', s.created_at) AS m,
               SUM(s.valor_estimado - s.valor_aprovado) FILTER (WHERE s.valor_estimado > s.valor_aprovado) AS v
        FROM solicitacoes s
        WHERE s.organization_id = p_organization_id
          AND s.created_at >= v_start_date AND s.created_at <= v_now
          AND (p_category_id IS NULL OR s.categoria_id = p_category_id)
          AND (p_supplier_id IS NULL OR s.fornecedor_id = p_supplier_id)
        GROUP BY 1
    ) ec ON ec.m = m.m;

    -- 4. Top categorias (pedidos da janela; solicitação e categoria são PK → sem duplicar)
    SELECT jsonb_agg(t) INTO v_top_categories
    FROM (
        SELECT
            cat.nome as name,
            SUM(p.valor_total) as value,
            ROUND(100.0 * SUM(p.valor_total) / NULLIF(SUM(SUM(p.valor_total)) OVER(), 0), 1) as percentage
        FROM pedidos p
        JOIN solicitacoes s ON p.solicitacao_id = s.id
        JOIN categorias cat ON s.categoria_id = cat.id
        WHERE p.organization_id = p_organization_id
          AND p.data_emissao >= v_start_date::date AND p.data_emissao <= v_now::date
          AND (p_category_id IS NULL OR s.categoria_id = p_category_id)
          AND (p_supplier_id IS NULL OR p.fornecedor_id = p_supplier_id)
        GROUP BY cat.nome
        ORDER BY value DESC
        LIMIT 5
    ) t;

    -- 5. Itens urgentes (estado atual, com filtros)
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
        AND (p_category_id IS NULL OR categoria_id = p_category_id)
        AND (p_supplier_id IS NULL OR fornecedor_id = p_supplier_id)
        ORDER BY data_necessidade ASC NULLS LAST
        LIMIT 5
    ) t;

    -- 6. Status das cotações da janela
    SELECT jsonb_agg(t) INTO v_cotacao_status
    FROM (
        SELECT
            c.status as name,
            COUNT(*) as value,
            CASE
                WHEN c.status = 'pendente' THEN '#f59e0b'
                WHEN c.status = 'enviada' THEN '#3b82f6'
                WHEN c.status = 'em_analise' THEN '#8b5cf6'
                WHEN c.status = 'selecionada' THEN '#10b981'
                ELSE '#94a3b8'
            END as color
        FROM cotacoes c
        WHERE c.organization_id = p_organization_id
          AND c.created_at >= v_start_date AND c.created_at <= v_now
          AND (p_supplier_id IS NULL OR c.fornecedor_id = p_supplier_id)
          AND (p_category_id IS NULL OR EXISTS (
                SELECT 1 FROM solicitacoes s WHERE s.id = c.solicitacao_id AND s.categoria_id = p_category_id))
        GROUP BY c.status
    ) t;

    RETURN jsonb_build_object(
        'kpis', v_kpis,
        'pipeline', v_pipeline,
        'trends', COALESCE(v_trends, '[]'::jsonb),
        'topCategories', COALESCE(v_top_categories, '[]'::jsonb),
        'urgentItems', COALESCE(v_urgent_items, '[]'::jsonb),
        'cotacaoStatus', COALESCE(v_cotacao_status, '[]'::jsonb)
    );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_compras_dashboard_metrics(uuid, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_compras_dashboard_metrics(uuid, text, uuid, uuid) TO authenticated, service_role;
