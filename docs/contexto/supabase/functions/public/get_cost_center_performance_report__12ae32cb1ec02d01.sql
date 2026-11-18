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
$function$
