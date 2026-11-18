CREATE OR REPLACE FUNCTION public.fill_tenant_id_from_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_tenant uuid;
begin
  if v_uid is null then
    return new;
  end if;

  if new.tenant_id is not null
     and exists (select 1 from public.tenants t where t.id = new.tenant_id)
     and not exists (select 1 from public.tenants t where t.organization_id = new.tenant_id) then
    return new;
  end if;

  select ut.tenant_id into v_tenant
    from public.user_tenants ut
   where ut.user_id = v_uid and ut.is_default
   order by ut.joined_at
   limit 1;

  if v_tenant is null then
    select p.tenant_id into v_tenant
      from public.profiles p
     where p.user_id = v_uid or p.id = v_uid
     order by (p.user_id = v_uid) desc nulls last
     limit 1;
  end if;

  if v_tenant is not null then
    new.tenant_id := v_tenant;
  end if;

  return new;
end;
$function$
