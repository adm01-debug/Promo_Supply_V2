-- ============================================
-- REVERSAO da migration 20261125162000_rpc_orcamento_por_tenant.sql
-- NAO fica em supabase/migrations/ de proposito: o canal aplicar-migration-prod.yml
-- varre aquela pasta e aplicaria isto junto.
--
-- Recria as DUAS sobrecargas de public.get_cost_center_performance_report exatamente
-- como estavam em producao antes da migration (lidas por pg_get_functiondef em
-- 2026-11-24), inclusive os grants originais:
--   - sem argumento: SECURITY DEFINER, sem filtro de tenant, PUBLIC/anon revogados;
--   - com p_organization_id: invoker, cc.organization_id (coluna inexistente) e
--     al.entity_id::uuid, com EXECUTE tambem para PUBLIC e anon.
-- ============================================

DROP FUNCTION IF EXISTS public.get_cost_center_performance_report(uuid);
DROP FUNCTION IF EXISTS public.get_cost_center_performance_report();

CREATE OR REPLACE FUNCTION public.get_cost_center_performance_report()
 RETURNS TABLE(cost_center_id uuid, cost_center_name text, cost_center_code text, total_budget numeric, total_committed numeric, total_used numeric, available_balance numeric, usage_percentage numeric, alerts_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        cc.id,
        cc.name,
        cc.code,
        COALESCE(SUM(db.valor_total), 0) as total_budget,
        COALESCE(SUM(db.valor_comprometido), 0) as total_committed,
        COALESCE(SUM(db.valor_utilizado), 0) as total_used,
        COALESCE(SUM(db.valor_total - db.valor_comprometido - db.valor_utilizado), 0) as available_balance,
        CASE
            WHEN COALESCE(SUM(db.valor_total), 0) > 0
            THEN (COALESCE(SUM(db.valor_comprometido + db.valor_utilizado), 0) / SUM(db.valor_total)) * 100
            ELSE 0
        END as usage_percentage,
        COUNT(db.id) FILTER (WHERE (db.valor_comprometido + db.valor_utilizado) > (db.valor_total * 0.9)) as alerts_count
    FROM public.cost_centers cc
    LEFT JOIN public.department_budgets db ON cc.id = db.cost_center_id
    WHERE cc.is_active = true
    GROUP BY cc.id, cc.name, cc.code
    ORDER BY usage_percentage DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_cost_center_performance_report(p_organization_id uuid)
 RETURNS TABLE(cost_center_id uuid, cost_center_name text, cost_center_code text, total_budget numeric, total_committed numeric, total_used numeric, available_balance numeric, usage_percentage numeric, alerts_count integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    cc.id as cost_center_id,
    cc.name as cost_center_name,
    cc.code as cost_center_code,
    COALESCE(SUM(db.valor_total), 0) as total_budget,
    COALESCE(SUM(db.valor_comprometido), 0) as total_committed,
    COALESCE(SUM(db.valor_utilizado), 0) as total_used,
    COALESCE(SUM(db.valor_total - db.valor_comprometido - db.valor_utilizado), 0) as available_balance,
    CASE
      WHEN SUM(db.valor_total) > 0
      THEN ROUND((SUM(db.valor_comprometido + db.valor_utilizado) / SUM(db.valor_total)) * 100, 2)
      ELSE 0
    END as usage_percentage,
    (SELECT COUNT(*)::INTEGER FROM public.audit_logs al
     WHERE al.entity_id::uuid = cc.id AND al.action_type = 'update' AND al.organization_id = p_organization_id) as alerts_count
  FROM public.cost_centers cc
  LEFT JOIN public.department_budgets db ON cc.id = db.cost_center_id
  WHERE cc.organization_id = p_organization_id
  GROUP BY cc.id, cc.name, cc.code;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_cost_center_performance_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cost_center_performance_report() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cost_center_performance_report(uuid) TO PUBLIC, anon, authenticated, service_role;
