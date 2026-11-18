CREATE OR REPLACE FUNCTION public.refresh_mv_dashboard_kpis()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_kpis;
  INSERT INTO public.health_scan_runs (scan_name, status, details)
  VALUES ('refresh_mv_dashboard_kpis', 'ok', jsonb_build_object('refreshed_at', now()));
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.health_scan_runs (scan_name, status, details)
  VALUES ('refresh_mv_dashboard_kpis', 'error', jsonb_build_object('error', SQLERRM));
  RAISE;
END;
$function$
