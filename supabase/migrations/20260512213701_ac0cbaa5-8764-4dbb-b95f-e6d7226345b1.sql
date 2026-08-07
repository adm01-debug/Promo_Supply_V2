-- Update get_cost_center_performance_report
CREATE OR REPLACE FUNCTION public.get_cost_center_performance_report(p_organization_id UUID)
RETURNS TABLE (
  cost_center_id UUID,
  cost_center_name TEXT,
  cost_center_code TEXT,
  total_budget NUMERIC,
  total_committed NUMERIC,
  total_used NUMERIC,
  available_balance NUMERIC,
  usage_percentage NUMERIC,
  alerts_count INTEGER
) LANGUAGE plpgsql AS $$
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
$$;
