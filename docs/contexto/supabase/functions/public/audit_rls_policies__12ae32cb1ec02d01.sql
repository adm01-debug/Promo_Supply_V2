CREATE OR REPLACE FUNCTION public.audit_rls_policies()
 RETURNS TABLE(tablename text, policyname text, roles text[], cmd text, using_expression text, check_expression text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
  SELECT p.tablename::text,
         p.policyname::text,
         p.roles::text[],
         p.cmd::text,
         p.qual::text,
         p.with_check::text
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public';
$function$
