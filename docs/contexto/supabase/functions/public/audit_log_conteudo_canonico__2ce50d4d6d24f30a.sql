CREATE OR REPLACE FUNCTION public.audit_log_conteudo_canonico(r audit_logs)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT concat_ws('|',
    r.id::text,
    coalesce(r.user_id::text, ''),
    coalesce(r.user_email, ''),
    coalesce(r.user_name, ''),
    r.action_type::text,
    r.entity_type::text,
    coalesce(r.entity_id, ''),
    coalesce(r.entity_description, ''),
    coalesce(r.old_values::text, ''),
    coalesce(r.new_values::text, ''),
    coalesce(r.metadata::text, ''),
    coalesce(r.ip_address, ''),
    coalesce(r.user_agent, ''),
    to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS.US'),
    coalesce(r.organization_id::text, ''),
    coalesce(r.tenant_id::text, ''),
    coalesce(r.sequencia::text, '')
  )
$function$
