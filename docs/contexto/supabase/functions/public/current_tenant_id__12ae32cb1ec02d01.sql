CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_claims text;
BEGIN
  -- 1) Claim do token, quando houver custom access token hook.
  BEGIN
    v_claims := current_setting('request.jwt.claims', true);
  EXCEPTION WHEN OTHERS THEN
    v_claims := NULL;
  END;
  IF v_claims IS NOT NULL THEN
    BEGIN
      v_tenant := nullif(v_claims::jsonb ->> 'tenant_id', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_tenant := NULL;
    END;
  END IF;
  IF v_tenant IS NOT NULL THEN
    RETURN v_tenant;
  END IF;

  -- 2) Vinculo explicito do usuario (padrao primeiro, senao o mais antigo).
  BEGIN
    SELECT ut.tenant_id INTO v_tenant
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
    ORDER BY ut.is_default DESC, ut.joined_at ASC, ut.tenant_id
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_tenant := NULL;
  END;
  IF v_tenant IS NOT NULL THEN
    RETURN v_tenant;
  END IF;

  -- 3) Cadastro: handle_new_user/fill_tenant_id_from_profile preenchem profiles.tenant_id.
  BEGIN
    SELECT p.tenant_id INTO v_tenant
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_tenant := NULL;
  END;

  RETURN v_tenant;
END;
$function$
