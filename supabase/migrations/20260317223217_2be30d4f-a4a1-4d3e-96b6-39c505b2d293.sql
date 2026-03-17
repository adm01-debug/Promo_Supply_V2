-- 5. Recreate supplier_compliance_summary view with security_invoker
DROP VIEW IF EXISTS public.supplier_compliance_summary;
CREATE VIEW public.supplier_compliance_summary WITH (security_invoker = true) AS
  SELECT
    f.id AS fornecedor_id,
    f.razao_social,
    f.status,
    f.avaliacao,
    COALESCE(cp_agg.penalty_count, 0) AS penalty_count,
    COALESCE(cp_agg.total_penalty_value, 0) AS total_penalty_value,
    COALESCE(rc_agg.avg_quality_score, 0) AS avg_quality_score,
    COALESCE(sb_agg.bonus_count, 0) AS bonus_count,
    COALESCE(sb_agg.total_bonus_value, 0) AS total_bonus_value
  FROM public.fornecedores f
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS penalty_count, COALESCE(SUM(cp.penalty_value), 0) AS total_penalty_value
    FROM public.contract_penalties cp
    JOIN public.contracts c ON c.id = cp.contract_id
    WHERE c.supplier_id = f.id::text
  ) cp_agg ON true
  LEFT JOIN LATERAL (
    SELECT AVG(rc.overall_score) AS avg_quality_score
    FROM public.receiving_checklists rc
    WHERE rc.fornecedor_id = f.id
  ) rc_agg ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS bonus_count, COALESCE(SUM(sb.value_percent), 0) AS total_bonus_value
    FROM public.supplier_bonifications sb
    WHERE sb.fornecedor_id = f.id
  ) sb_agg ON true;