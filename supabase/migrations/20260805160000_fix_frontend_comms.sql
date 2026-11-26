-- Correções de comunicação frontend — aplicados em 2026-08-05T15:XX:00
-- Resolve: 404 current_tenant_id, HTTP 400 user_tenants embedded select

-- 1) current_tenant_id: tolerar NULL em current_setting (sem JWT no contexto)
CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public AS $$
DECLARE v_tenant UUID; v_claims text;
BEGIN
  BEGIN v_claims := current_setting('request.jwt.claims', true); EXCEPTION WHEN OTHERS THEN v_claims := NULL; END;
  IF v_claims IS NOT NULL THEN
    BEGIN v_tenant := nullif(v_claims::jsonb ->> 'tenant_id', '')::uuid;
    EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END;
  END IF;
  IF v_tenant IS NOT NULL THEN RETURN v_tenant; END IF;
  BEGIN SELECT tenant_id INTO v_tenant FROM public.user_tenants WHERE user_id = auth.uid() AND is_default = true LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END;
  RETURN v_tenant;
END; $$;

-- 2) tenant_in_my_group(_tenant_id): proteção contra UUIDs NULL
CREATE OR REPLACE FUNCTION public.tenant_in_my_group(_tenant_id uuid)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public AS $$
DECLARE v_current uuid; v_user_tenants uuid[];
BEGIN
  IF _tenant_id IS NULL THEN RETURN false; END IF;
  BEGIN v_current := public.current_tenant_id(); EXCEPTION WHEN OTHERS THEN v_current := NULL; END;
  IF v_current IS NOT NULL AND _tenant_id = v_current THEN RETURN true; END IF;
  BEGIN SELECT array_agg(tenant_id) INTO v_user_tenants FROM public.user_tenants WHERE user_id = auth.uid();
  EXCEPTION WHEN OTHERS THEN v_user_tenants := NULL; END;
  IF v_user_tenants IS NOT NULL AND _tenant_id = ANY(v_user_tenants) THEN RETURN true; END IF;
  RETURN false;
END; $$;

-- 3) has_role(_user_id, _role): parâmetros com underscore conforme schema existente
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public AS $$
DECLARE v_has boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  BEGIN SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) INTO v_has;
  EXCEPTION WHEN OTHERS THEN v_has := false; END;
  RETURN COALESCE(v_has, false);
END; $$;

-- 4) FK user_tenants.tenant_id -> tenants.id (resolve HTTP 400 no embedded select)
--    Primeiro remove registro órfão com tenant_id = '00000000-...'
DELETE FROM public.user_tenants WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
ALTER TABLE public.user_tenants ADD CONSTRAINT user_tenants_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
