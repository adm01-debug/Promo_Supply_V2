-- Reversao de 20261126160000_current_tenant_id_resolve_por_cadastro.sql.
-- Nao e aplicada automaticamente (fica fora de supabase/migrations de proposito).
-- Restaura exatamente a versao de 20260805160000_fix_frontend_comms.sql.

BEGIN;

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

COMMIT;
