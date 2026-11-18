CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(_from date DEFAULT ((now() - '90 days'::interval))::date, _to date DEFAULT (now())::date)
 RETURNS SETOF mv_dashboard_kpis
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM public.mv_dashboard_kpis
  WHERE dia BETWEEN _from AND _to
    AND public.tenant_in_my_group(tenant_id);
$function$
