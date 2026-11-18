CREATE OR REPLACE FUNCTION public.get_my_organization()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid();
$function$
