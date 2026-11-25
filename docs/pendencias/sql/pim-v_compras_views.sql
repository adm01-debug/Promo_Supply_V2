-- Views de integracao compras <-> PIM (projeto Supabase doufsxqlfjyuvxuezpln)
--
-- ESTADO: esta DDL NAO tem migration no repo do PIM; vive apenas no banco de
-- producao. Este arquivo e a copia versionada da definicao corrigida em
-- 25/11/2026, para nao se perder num db reset. As tres views existiam e
-- devolviam 0 linhas porque o predicado can_view_all_sales() exige auth.uid()
-- (JWT) e o bridge le com chave de servico, sem JWT. A correcao troca o
-- predicado por (auth.uid() IS NULL OR can_view_all_sales()), que preserva o
-- bloqueio para usuario logado sem papel de gestao e para anon (que tambem
-- nao tem GRANT SELECT), e libera apenas a sessao de servico.
--
-- Medido depois da correcao (sessao de servico):
--   v_compras_catalogo        = 20.779 linhas (33 colunas)
--   v_compras_precos_faixa    = 426.267 linhas (16 colunas)
--   v_compras_precos_variante = 28.814 linhas (62 colunas)

-- ===================== DEFINICAO CORRIGIDA =====================

-- v_compras_catalogo
CREATE OR REPLACE VIEW public.v_compras_catalogo AS
 SELECT p.id AS pim_product_id,
    v.id AS pim_variant_id,
    p.sku,
    p.sku_promo,
    p.name,
    p.supplier_id,
    s.code AS supplier_code,
    s.name AS supplier_name,
    COALESCE(v.supplier_sku, p.supplier_reference) AS supplier_reference,
    p.supplier_external_id,
    p.cost_price,
    p.sale_price,
    p.suggested_price,
    p.ipi_rate,
    p.ncm_code,
    p.min_quantity,
    p.min_order_quantity,
    s.min_order_value,
    COALESCE(v.stock_quantity, p.stock_quantity) AS stock_quantity,
    p.is_stockout,
    p.last_stock_update_at,
    p.xbz_stock_reliability_text,
    v.color_id,
    v.color_name,
    v.color_code,
    v.color_hex,
    v.size_code,
    COALESCE(p.primary_image_url, p.primary_image_fallback_url) AS image_url,
    p.lead_time_days,
    p.price_updated_at,
    p.price_verified_at,
    p.price_freshness_threshold_days,
    p.updated_at
   FROM products p
     JOIN suppliers s ON s.id = p.supplier_id
     LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_active
  WHERE p.is_active AND NOT COALESCE(p.is_deleted, false) AND s.active AND s.is_product_supplier AND (auth.uid() IS NULL OR can_view_all_sales());
;

-- v_compras_precos_faixa
CREATE OR REPLACE VIEW public.v_compras_precos_faixa AS
 SELECT pcp.product_id AS pim_product_id,
    NULL::uuid AS pim_variant_id,
    band.qty_min,
    lead(band.qty_min) OVER (PARTITION BY pcp.id ORDER BY band.ord) - 1 AS qty_max,
    band.unit_cost,
    NULL::numeric AS unit_price,
    'spot_customization'::text AS source,
    pcp.service_code,
    pcp.table_code,
    pcp.component,
    pcp.location,
    pcp.handling_cost,
    pcp.table_max_area_cm2,
    pcp.max_stitches,
    pcp.hotspot,
    pcp.currency
   FROM product_customization_prices pcp
     CROSS JOIN LATERAL ( SELECT t.qty_min_val AS qty_min,
            t.price_val AS unit_cost,
            t.ord
           FROM UNNEST(pcp.min_qty, pcp.price) WITH ORDINALITY t(qty_min_val, price_val, ord)) band
  WHERE array_length(pcp.min_qty, 1) > 0 AND (auth.uid() IS NULL OR can_view_all_sales());
;

-- v_compras_precos_variante
CREATE OR REPLACE VIEW public.v_compras_precos_variante AS
 SELECT pim_product_id,
    pim_variant_id,
    tier,
    qty_min,
    qty_max,
    unit_cost,
    unit_price,
    source
   FROM ( SELECT vw_variant_sale_prices.product_id AS pim_product_id,
            vw_variant_sale_prices.variant_id AS pim_variant_id,
            1 AS tier,
            vw_variant_sale_prices.min_qty_1 AS qty_min,
            vw_variant_sale_prices.min_qty_2 - 1 AS qty_max,
            vw_variant_sale_prices.cost_price_1 AS unit_cost,
            vw_variant_sale_prices.sale_price_1 AS unit_price,
            'vw_variant_sale_prices'::text AS source
           FROM vw_variant_sale_prices
          WHERE vw_variant_sale_prices.min_qty_1 IS NOT NULL
        UNION ALL
         SELECT vw_variant_sale_prices.product_id AS pim_product_id,
            vw_variant_sale_prices.variant_id AS pim_variant_id,
            2 AS tier,
            vw_variant_sale_prices.min_qty_2 AS qty_min,
            vw_variant_sale_prices.min_qty_3 - 1 AS qty_max,
            vw_variant_sale_prices.cost_price_2 AS unit_cost,
            vw_variant_sale_prices.sale_price_2 AS unit_price,
            'vw_variant_sale_prices'::text AS source
           FROM vw_variant_sale_prices
          WHERE vw_variant_sale_prices.min_qty_2 IS NOT NULL
        UNION ALL
         SELECT vw_variant_sale_prices.product_id AS pim_product_id,
            vw_variant_sale_prices.variant_id AS pim_variant_id,
            3 AS tier,
            vw_variant_sale_prices.min_qty_3 AS qty_min,
            vw_variant_sale_prices.min_qty_4 - 1 AS qty_max,
            vw_variant_sale_prices.cost_price_3 AS unit_cost,
            vw_variant_sale_prices.sale_price_3 AS unit_price,
            'vw_variant_sale_prices'::text AS source
           FROM vw_variant_sale_prices
          WHERE vw_variant_sale_prices.min_qty_3 IS NOT NULL
        UNION ALL
         SELECT vw_variant_sale_prices.product_id AS pim_product_id,
            vw_variant_sale_prices.variant_id AS pim_variant_id,
            4 AS tier,
            vw_variant_sale_prices.min_qty_4 AS qty_min,
            vw_variant_sale_prices.min_qty_5 - 1 AS qty_max,
            vw_variant_sale_prices.cost_price_4 AS unit_cost,
            vw_variant_sale_prices.sale_price_4 AS unit_price,
            'vw_variant_sale_prices'::text AS source
           FROM vw_variant_sale_prices
          WHERE vw_variant_sale_prices.min_qty_4 IS NOT NULL
        UNION ALL
         SELECT vw_variant_sale_prices.product_id AS pim_product_id,
            vw_variant_sale_prices.variant_id AS pim_variant_id,
            5 AS tier,
            vw_variant_sale_prices.min_qty_5 AS qty_min,
            NULL::integer AS qty_max,
            vw_variant_sale_prices.cost_price_5 AS unit_cost,
            vw_variant_sale_prices.sale_price_5 AS unit_price,
            'vw_variant_sale_prices'::text AS source
           FROM vw_variant_sale_prices
          WHERE vw_variant_sale_prices.min_qty_5 IS NOT NULL) q
  WHERE (auth.uid() IS NULL OR can_view_all_sales());
;

-- ===================== ROLLBACK (definicao anterior) ============
-- Aplicar apenas se a correcao precisar ser revertida:

-- v_compras_catalogo
-- CREATE OR REPLACE VIEW public.v_compras_catalogo AS
--  SELECT p.id AS pim_product_id,
--     v.id AS pim_variant_id,
--     p.sku,
--     p.sku_promo,
--     p.name,
--     p.supplier_id,
--     s.code AS supplier_code,
--     s.name AS supplier_name,
--     COALESCE(v.supplier_sku, p.supplier_reference) AS supplier_reference,
--     p.supplier_external_id,
--     p.cost_price,
--     p.sale_price,
--     p.suggested_price,
--     p.ipi_rate,
--     p.ncm_code,
--     p.min_quantity,
--     p.min_order_quantity,
--     s.min_order_value,
--     COALESCE(v.stock_quantity, p.stock_quantity) AS stock_quantity,
--     p.is_stockout,
--     p.last_stock_update_at,
--     p.xbz_stock_reliability_text,
--     v.color_id,
--     v.color_name,
--     v.color_code,
--     v.color_hex,
--     v.size_code,
--     COALESCE(p.primary_image_url, p.primary_image_fallback_url) AS image_url,
--     p.lead_time_days,
--     p.price_updated_at,
--     p.price_verified_at,
--     p.price_freshness_threshold_days,
--     p.updated_at
--    FROM products p
--      JOIN suppliers s ON s.id = p.supplier_id
--      LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_active
--   WHERE p.is_active AND NOT COALESCE(p.is_deleted, false) AND s.active AND s.is_product_supplier AND can_view_all_sales();
-- ;

-- v_compras_precos_faixa
-- CREATE OR REPLACE VIEW public.v_compras_precos_faixa AS
--  SELECT pcp.product_id AS pim_product_id,
--     NULL::uuid AS pim_variant_id,
--     band.qty_min,
--     lead(band.qty_min) OVER (PARTITION BY pcp.id ORDER BY band.ord) - 1 AS qty_max,
--     band.unit_cost,
--     NULL::numeric AS unit_price,
--     'spot_customization'::text AS source,
--     pcp.service_code,
--     pcp.table_code,
--     pcp.component,
--     pcp.location,
--     pcp.handling_cost,
--     pcp.table_max_area_cm2,
--     pcp.max_stitches,
--     pcp.hotspot,
--     pcp.currency
--    FROM product_customization_prices pcp
--      CROSS JOIN LATERAL ( SELECT t.qty_min_val AS qty_min,
--             t.price_val AS unit_cost,
--             t.ord
--            FROM UNNEST(pcp.min_qty, pcp.price) WITH ORDINALITY t(qty_min_val, price_val, ord)) band
--   WHERE array_length(pcp.min_qty, 1) > 0 AND can_view_all_sales();
-- ;

-- v_compras_precos_variante
-- CREATE OR REPLACE VIEW public.v_compras_precos_variante AS
--  SELECT pim_product_id,
--     pim_variant_id,
--     tier,
--     qty_min,
--     qty_max,
--     unit_cost,
--     unit_price,
--     source
--    FROM ( SELECT vw_variant_sale_prices.product_id AS pim_product_id,
--             vw_variant_sale_prices.variant_id AS pim_variant_id,
--             1 AS tier,
--             vw_variant_sale_prices.min_qty_1 AS qty_min,
--             vw_variant_sale_prices.min_qty_2 - 1 AS qty_max,
--             vw_variant_sale_prices.cost_price_1 AS unit_cost,
--             vw_variant_sale_prices.sale_price_1 AS unit_price,
--             'vw_variant_sale_prices'::text AS source
--            FROM vw_variant_sale_prices
--           WHERE vw_variant_sale_prices.min_qty_1 IS NOT NULL
--         UNION ALL
--          SELECT vw_variant_sale_prices.product_id AS pim_product_id,
--             vw_variant_sale_prices.variant_id AS pim_variant_id,
--             2 AS tier,
--             vw_variant_sale_prices.min_qty_2 AS qty_min,
--             vw_variant_sale_prices.min_qty_3 - 1 AS qty_max,
--             vw_variant_sale_prices.cost_price_2 AS unit_cost,
--             vw_variant_sale_prices.sale_price_2 AS unit_price,
--             'vw_variant_sale_prices'::text AS source
--            FROM vw_variant_sale_prices
--           WHERE vw_variant_sale_prices.min_qty_2 IS NOT NULL
--         UNION ALL
--          SELECT vw_variant_sale_prices.product_id AS pim_product_id,
--             vw_variant_sale_prices.variant_id AS pim_variant_id,
--             3 AS tier,
--             vw_variant_sale_prices.min_qty_3 AS qty_min,
--             vw_variant_sale_prices.min_qty_4 - 1 AS qty_max,
--             vw_variant_sale_prices.cost_price_3 AS unit_cost,
--             vw_variant_sale_prices.sale_price_3 AS unit_price,
--             'vw_variant_sale_prices'::text AS source
--            FROM vw_variant_sale_prices
--           WHERE vw_variant_sale_prices.min_qty_3 IS NOT NULL
--         UNION ALL
--          SELECT vw_variant_sale_prices.product_id AS pim_product_id,
--             vw_variant_sale_prices.variant_id AS pim_variant_id,
--             4 AS tier,
--             vw_variant_sale_prices.min_qty_4 AS qty_min,
--             vw_variant_sale_prices.min_qty_5 - 1 AS qty_max,
--             vw_variant_sale_prices.cost_price_4 AS unit_cost,
--             vw_variant_sale_prices.sale_price_4 AS unit_price,
--             'vw_variant_sale_prices'::text AS source
--            FROM vw_variant_sale_prices
--           WHERE vw_variant_sale_prices.min_qty_4 IS NOT NULL
--         UNION ALL
--          SELECT vw_variant_sale_prices.product_id AS pim_product_id,
--             vw_variant_sale_prices.variant_id AS pim_variant_id,
--             5 AS tier,
--             vw_variant_sale_prices.min_qty_5 AS qty_min,
--             NULL::integer AS qty_max,
--             vw_variant_sale_prices.cost_price_5 AS unit_cost,
--             vw_variant_sale_prices.sale_price_5 AS unit_price,
--             'vw_variant_sale_prices'::text AS source
--            FROM vw_variant_sale_prices
--           WHERE vw_variant_sale_prices.min_qty_5 IS NOT NULL) q
--   WHERE can_view_all_sales();
-- ;

