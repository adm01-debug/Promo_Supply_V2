CREATE OR REPLACE FUNCTION public.guard_profile_org_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Só requisições de usuário (PostgREST: role authenticated/anon) são checadas;
  -- service_role, postgres e auth (handle_new_user) passam.
  IF COALESCE(NULLIF(current_setting('role', true), ''), 'none') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = NEW.user_id AND ut.tenant_id = NEW.tenant_id
     ) THEN
    RAISE EXCEPTION 'Usuário sem vínculo com o tenant %', NEW.tenant_id USING ERRCODE = '42501';
  END IF;

  IF NEW.current_organization_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.current_organization_id IS DISTINCT FROM OLD.current_organization_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.user_tenants ut
         JOIN public.tenants t ON t.id = ut.tenant_id
        WHERE ut.user_id = NEW.user_id AND t.organization_id = NEW.current_organization_id
     ) THEN
    RAISE EXCEPTION 'Usuário sem vínculo com a organização %', NEW.current_organization_id USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$
