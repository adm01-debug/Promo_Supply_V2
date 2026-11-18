CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.tenant_in_my_group(NULLIF(auth.jwt() ->> 'tenant_id','')::uuid)
      THEN NULLIF(auth.jwt() ->> 'tenant_id','')::uuid
    ELSE NULL
  END;
$function$
