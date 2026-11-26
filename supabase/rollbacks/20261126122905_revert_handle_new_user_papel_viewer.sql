-- Reversao de 20261126122905_handle_new_user_papel_viewer.sql.
-- Nao e aplicada automaticamente (fica fora de supabase/migrations de proposito).
-- Volta o papel padrao do autocadastro para 'buyer' exatamente como estava na
-- migration 20261117150000_religa_cadastro_de_usuarios.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
  VALUES (NEW.id, 'buyer')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$fn$;

COMMIT;
