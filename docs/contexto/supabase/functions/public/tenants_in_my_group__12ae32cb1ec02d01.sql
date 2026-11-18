CREATE OR REPLACE FUNCTION public.tenants_in_my_group()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.tenants WHERE organization_id = public.get_user_grupo_id();
$function$
