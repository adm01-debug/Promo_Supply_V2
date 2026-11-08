-- Seed mínimo: tenant Promo Supply + 4 perfis de usuário + roles admin
-- Resolve: currencies char(1)->char(3), fixa trigger audit tolerante a falhas,
--          corrige tenant_id de placeholder ('00000000-...') para tenant real

DO $$
DECLARE
  v_org_id uuid;
  v_tenant_id uuid;
  v_root_tenant uuid := '00000000-0000-0000-0000-000000000000';
BEGIN

  -- 0) Seed currencies (schema Lovable tem char(1) que não cabe ISO codes)
  ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_default_currency_fkey;
  ALTER TABLE public.currencies DROP CONSTRAINT IF EXISTS currencies_pkey CASCADE;
  ALTER TABLE public.currencies ALTER COLUMN code TYPE char(3);
  ALTER TABLE public.currencies ADD PRIMARY KEY (code);
  ALTER TABLE public.tenants ALTER COLUMN default_currency TYPE char(3);
  ALTER TABLE public.tenants ADD CONSTRAINT tenants_default_currency_fkey FOREIGN KEY (default_currency) REFERENCES currencies(code);
  INSERT INTO public.currencies (code, name, symbol, decimal_places, is_active)
    VALUES ('BRL', 'Real Brasileiro', 'R$', 2, true), ('USD', 'US Dollar', '$', 2, true), ('EUR', 'Euro', '€', 2, true)
    ON CONFLICT DO NOTHING;

  -- 1) Corrigir trigger audit para ser tolerante a falhas (não fazer rollback)
  DROP TRIGGER IF EXISTS audit_user_roles_changes_trigger ON public.user_roles;
  CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
  DECLARE
    v_actor uuid; v_actor_email text; v_target_email text; v_tenant uuid;
    v_action text; v_old jsonb; v_new jsonb; v_target uuid;
  BEGIN
    BEGIN v_actor := auth.uid(); EXCEPTION WHEN OTHERS THEN v_actor := NULL; END;
    IF TG_OP = 'INSERT' THEN
      v_action := 'create'; v_target := NEW.user_id;
      v_new := jsonb_build_object('user_id', NEW.user_id, 'role', COALESCE(NEW.role::text,'unknown'));
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := 'update'; v_target := NEW.user_id;
      v_old := jsonb_build_object('user_id', OLD.user_id, 'role', COALESCE(OLD.role::text,'unknown'));
      v_new := jsonb_build_object('user_id', NEW.user_id, 'role', COALESCE(NEW.role::text,'unknown'));
      IF OLD.role IS NOT DISTINCT FROM NEW.role THEN RETURN NEW; END IF;
    ELSE
      v_action := 'delete'; v_target := OLD.user_id;
      v_old := jsonb_build_object('user_id', OLD.user_id, 'role', COALESCE(OLD.role::text,'unknown'));
    END IF;
    BEGIN SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor LIMIT 1; EXCEPTION WHEN OTHERS THEN v_actor_email := NULL; END;
    BEGIN SELECT email, tenant_id INTO v_target_email, v_tenant FROM public.profiles WHERE user_id = v_target LIMIT 1; EXCEPTION WHEN OTHERS THEN v_target_email := NULL; v_tenant := NULL; END;
    IF v_tenant IS NULL THEN BEGIN SELECT tenant_id INTO v_tenant FROM public.profiles WHERE user_id = v_actor LIMIT 1; EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END; END IF;
    IF v_tenant IS NULL THEN BEGIN SELECT tenant_id INTO v_tenant FROM public.tenants LIMIT 1; EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END; END IF;
    INSERT INTO public.audit_logs (id, user_id, user_email, user_name, action_type, entity_type, entity_id, entity_description, old_values, new_values, metadata, tenant_id, created_at)
    VALUES (gen_random_uuid(), v_actor, COALESCE(v_actor_email,'system'), 'user_roles_trigger',
      v_action::public.audit_action_type, 'usuario', v_target::text,
      format('Role %s: %s', TG_OP, COALESCE(NEW.role::text, OLD.role::text)),
      v_old, v_new, jsonb_build_object('source','user_roles_audit','op',TG_OP,'target_user_id',v_target,'target_email',v_target_email),
      COALESCE(v_tenant, gen_random_uuid()), now())
    ON CONFLICT DO NOTHING;
    RETURN COALESCE(NEW, OLD);
  EXCEPTION WHEN OTHERS THEN RETURN COALESCE(NEW, OLD);
  END; $f$;
  CREATE TRIGGER audit_user_roles_changes_trigger AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_changes();

  -- 2) Obter IDs
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'grupo-principal' LIMIT 1;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Organização grupo-principal não encontrada'; END IF;

  -- 3) Criar tenant
  INSERT INTO public.tenants (id, slug, name, status, plan, organization_id, default_currency, default_locale, created_at, updated_at)
  VALUES (gen_random_uuid(), 'promo-supply', 'Promo Supply', 'active', 'standard', v_org_id, 'BRL', 'pt-BR', now(), now())
  ON CONFLICT (slug) DO UPDATE SET updated_at = now(), organization_id = EXCLUDED.organization_id
  RETURNING id INTO v_tenant_id;
  IF v_tenant_id IS NULL THEN SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'promo-supply' LIMIT 1; END IF;

  RAISE NOTICE 'Tenant Promo Supply: %', v_tenant_id;

  -- 4) Corrigir trigger grant_tenant_access para usar NOT EXISTS
  DROP TRIGGER IF EXISTS grant_tenant_access_on_insert_trigger ON public.tenants;
  CREATE OR REPLACE FUNCTION public.grant_tenant_access_on_insert()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
  BEGIN
    IF NEW.organization_id IS NOT NULL THEN
      INSERT INTO public.user_tenants(user_id, tenant_id, role, is_default, joined_at)
      SELECT p.user_id, NEW.id, 'admin'::app_role, false, now()
      FROM public.profiles p
      WHERE p.current_organization_id = NEW.organization_id
      AND NOT EXISTS (SELECT 1 FROM public.user_tenants ut WHERE ut.user_id = p.user_id AND ut.tenant_id = NEW.id);
    END IF;
    RETURN NEW;
  END; $f$;
  CREATE TRIGGER grant_tenant_access_on_insert_trigger AFTER INSERT ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.grant_tenant_access_on_insert();

  -- 5) user_tenants (todos admin, limpar defaults existentes primeiro)
  UPDATE public.user_tenants SET is_default = false
    WHERE user_id IN ('fceb0729-82a2-458b-adb7-4c9716dc8801','0da266d8-e1cf-40ac-9d69-265c46e67336','2fafbb50-8ef0-4bf8-beed-e9952983e0e7','b1255ee0-9637-4d52-a9b5-ab351d292ceb')
    AND is_default = true;

  INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default, joined_at) VALUES ('fceb0729-82a2-458b-adb7-4c9716dc8801', v_tenant_id, 'admin', true, now())
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_default = true, role = 'admin';
  INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default, joined_at) VALUES ('0da266d8-e1cf-40ac-9d69-265c46e67336', v_tenant_id, 'admin', true, now())
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_default = true, role = 'admin';
  INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default, joined_at) VALUES ('2fafbb50-8ef0-4bf8-beed-e9952983e0e7', v_tenant_id, 'admin', true, now())
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_default = true, role = 'admin';
  INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default, joined_at) VALUES ('b1255ee0-9637-4d52-a9b5-ab351d292ceb', v_tenant_id, 'admin', true, now())
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_default = true, role = 'admin';

  -- 6) Profiles
  INSERT INTO public.profiles (id, user_id, full_name, email, tenant_id, current_organization_id, preferred_locale, created_at, updated_at)
  VALUES (gen_random_uuid(), 'fceb0729-82a2-458b-adb7-4c9716dc8801', 'Administrador', 'adm01@promobrindes.com.br', v_tenant_id, v_org_id, 'pt-BR', now(), now())
  ON CONFLICT (user_id) DO UPDATE SET tenant_id = v_tenant_id, current_organization_id = v_org_id, full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = now();

  INSERT INTO public.profiles (id, user_id, full_name, email, tenant_id, current_organization_id, preferred_locale, created_at, updated_at)
  VALUES (gen_random_uuid(), '0da266d8-e1cf-40ac-9d69-265c46e67336', 'TI 02', 'ti02.promobrindes@gmail.com', v_tenant_id, v_org_id, 'pt-BR', now(), now())
  ON CONFLICT (user_id) DO UPDATE SET tenant_id = v_tenant_id, current_organization_id = v_org_id, full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = now();

  INSERT INTO public.profiles (id, user_id, full_name, email, tenant_id, current_organization_id, preferred_locale, created_at, updated_at)
  VALUES (gen_random_uuid(), '2fafbb50-8ef0-4bf8-beed-e9952983e0e7', 'TI', 'ti@promobrindes.com.br', v_tenant_id, v_org_id, 'pt-BR', now(), now())
  ON CONFLICT (user_id) DO UPDATE SET tenant_id = v_tenant_id, current_organization_id = v_org_id, full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = now();

  -- 7) user_roles (admin para os 3 usuários originais)
  INSERT INTO public.user_roles (id, user_id, role, created_at)
    SELECT gen_random_uuid(), 'fceb0729-82a2-458b-adb7-4c9716dc8801', 'admin'::app_role, now()
    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = 'fceb0729-82a2-458b-adb7-4c9716dc8801' AND role = 'admin'::app_role);
  INSERT INTO public.user_roles (id, user_id, role, created_at)
    SELECT gen_random_uuid(), '0da266d8-e1cf-40ac-9d69-265c46e67336', 'admin'::app_role, now()
    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = '0da266d8-e1cf-40ac-9d69-265c46e67336' AND role = 'admin'::app_role);
  INSERT INTO public.user_roles (id, user_id, role, created_at)
    SELECT gen_random_uuid(), '2fafbb50-8ef0-4bf8-beed-e9952983e0e7', 'admin'::app_role, now()
    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = '2fafbb50-8ef0-4bf8-beed-e9952983e0e7' AND role = 'admin'::app_role);

  -- 8) Corrigir tenant_id de placeholder em todas as tabelas
  -- (trigger insere '00000000-...' em vez do ID real)
  UPDATE public.fornecedores SET tenant_id = v_tenant_id WHERE tenant_id = v_root_tenant OR tenant_id IS NULL;
  UPDATE public.categorias SET tenant_id = v_tenant_id WHERE tenant_id = v_root_tenant OR tenant_id IS NULL;
  UPDATE public.produtos SET tenant_id = v_tenant_id WHERE tenant_id = v_root_tenant OR tenant_id IS NULL;
  UPDATE public.solicitacoes SET tenant_id = v_tenant_id WHERE tenant_id = v_root_tenant OR tenant_id IS NULL;
  UPDATE public.pedidos SET tenant_id = v_tenant_id WHERE tenant_id = v_root_tenant OR tenant_id IS NULL;
  UPDATE public.cotacoes SET tenant_id = v_tenant_id WHERE tenant_id = v_root_tenant OR tenant_id IS NULL;

  RAISE NOTICE 'Seed concluído. Tenant: %', v_tenant_id;
END $$;
