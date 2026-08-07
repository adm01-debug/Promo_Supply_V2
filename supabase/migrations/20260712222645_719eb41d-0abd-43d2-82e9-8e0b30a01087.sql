
REVOKE SELECT ON public.mv_dashboard_kpis FROM authenticated, anon;
-- service_role keeps ALL (for admin/refresh); function get_dashboard_kpis runs SECURITY INVOKER
-- so we allow the API role to read via the function's implicit privileges:
GRANT SELECT ON public.mv_dashboard_kpis TO postgres;

-- Recreate wrapper as SECURITY DEFINER so authenticated callers can read
-- filtered rows without needing direct SELECT on the MV.
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
  _from date DEFAULT (now() - interval '90 days')::date,
  _to date DEFAULT now()::date
)
RETURNS SETOF public.mv_dashboard_kpis
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.mv_dashboard_kpis
  WHERE dia BETWEEN _from AND _to
    AND public.tenant_in_my_group(tenant_id);
$$;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_kpis(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis(date, date) TO authenticated;
