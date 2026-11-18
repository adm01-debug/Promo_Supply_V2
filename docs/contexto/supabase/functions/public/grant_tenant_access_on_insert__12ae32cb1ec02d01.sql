CREATE OR REPLACE FUNCTION public.grant_tenant_access_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    INSERT INTO public.user_tenants(user_id, tenant_id)
    SELECT p.user_id, NEW.id
    FROM public.profiles p
    WHERE p.current_organization_id = NEW.organization_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $function$
