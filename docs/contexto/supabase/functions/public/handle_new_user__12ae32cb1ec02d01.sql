CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_org    uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.tenants LIMIT 2;
  IF (SELECT count(*) FROM public.tenants) <> 1 THEN
    v_tenant := NULL;
  END IF;

  SELECT id INTO v_org FROM public.organizations LIMIT 2;
  IF (SELECT count(*) FROM public.organizations) <> 1 THEN
    v_org := NULL;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email, tenant_id, current_organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    v_tenant,
    v_org
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$
