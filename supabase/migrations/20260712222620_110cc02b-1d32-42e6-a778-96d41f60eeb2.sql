
-- Wave 65: R-10 Materialized view for dashboard KPIs (per tenant per day)
DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard_kpis;

CREATE MATERIALIZED VIEW public.mv_dashboard_kpis AS
SELECT
  p.tenant_id,
  date_trunc('day', p.created_at)::date AS dia,
  COUNT(*)::bigint AS total_pedidos,
  COALESCE(SUM(p.valor_total), 0)::numeric AS valor_total,
  COALESCE(AVG(p.valor_total), 0)::numeric AS ticket_medio,
  COUNT(DISTINCT p.fornecedor_id)::bigint AS fornecedores_unicos,
  COUNT(*) FILTER (WHERE p.status = 'entregue')::bigint AS pedidos_entregues,
  COUNT(*) FILTER (WHERE p.status = 'cancelado')::bigint AS pedidos_cancelados
FROM public.pedidos p
WHERE p.created_at >= (now() - interval '2 years')
GROUP BY p.tenant_id, date_trunc('day', p.created_at)::date;

-- Unique index required for CONCURRENT refresh
CREATE UNIQUE INDEX idx_mv_dashboard_kpis_pk
  ON public.mv_dashboard_kpis (tenant_id, dia);

CREATE INDEX idx_mv_dashboard_kpis_dia
  ON public.mv_dashboard_kpis (dia DESC);

GRANT SELECT ON public.mv_dashboard_kpis TO authenticated;
GRANT ALL ON public.mv_dashboard_kpis TO service_role;

-- Refresh function (SECURITY DEFINER so cron can run it)
CREATE OR REPLACE FUNCTION public.refresh_mv_dashboard_kpis()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_kpis;
  INSERT INTO public.health_scan_runs (scan_name, status, details)
  VALUES ('refresh_mv_dashboard_kpis', 'ok', jsonb_build_object('refreshed_at', now()));
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.health_scan_runs (scan_name, status, details)
  VALUES ('refresh_mv_dashboard_kpis', 'error', jsonb_build_object('error', SQLERRM));
  RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_mv_dashboard_kpis() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_mv_dashboard_kpis() TO service_role;

-- Wrapper readable by tenant users (returns rows filtered by RLS-equivalent group check)
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
  _from date DEFAULT (now() - interval '90 days')::date,
  _to date DEFAULT now()::date
)
RETURNS SETOF public.mv_dashboard_kpis
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM public.mv_dashboard_kpis
  WHERE dia BETWEEN _from AND _to
    AND public.tenant_in_my_group(tenant_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis(date, date) TO authenticated;

-- Initial populate (non-concurrent; view was just created)
REFRESH MATERIALIZED VIEW public.mv_dashboard_kpis;

-- Schedule refresh every 15 min
SELECT cron.schedule(
  'refresh-mv-dashboard-kpis',
  '*/15 * * * *',
  $$SELECT public.refresh_mv_dashboard_kpis();$$
);
