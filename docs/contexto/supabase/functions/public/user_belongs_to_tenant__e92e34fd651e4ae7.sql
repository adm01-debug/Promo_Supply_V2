CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id uuid, _tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(NULLIF(current_setting('role', true), ''), 'none')
         NOT IN ('none', 'postgres', 'service_role', 'supabase_admin')
      THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE user_id = _user_id AND tenant_id = _tenant_id
    )
  END
$function$
