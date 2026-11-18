CREATE OR REPLACE FUNCTION public.tenant_in_my_group(_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = _tenant_id AND t.organization_id = public.get_user_grupo_id());
$function$
