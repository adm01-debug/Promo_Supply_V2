CREATE OR REPLACE FUNCTION public.audit_logs_bloquear_truncate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'audit_logs e append-only: TRUNCATE bloqueado (ISO 27001 A.8.15)'
    USING ERRCODE = '42501';
END;
$function$
