CREATE OR REPLACE FUNCTION public.get_cost_center_performance_report()
 RETURNS TABLE(cost_center_id uuid, cost_center_name text, cost_center_code text, total_budget numeric, total_committed numeric, total_used numeric, available_balance numeric, usage_percentage numeric, alerts_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        p.cost_center_id,
        p.cost_center_name,
        p.cost_center_code,
        p.total_budget,
        p.total_committed,
        p.total_used,
        p.available_balance,
        p.usage_percentage,
        p.alerts_count
    FROM public.get_cost_center_performance_report(public.get_user_grupo_id()) AS p;
END;
$function$
