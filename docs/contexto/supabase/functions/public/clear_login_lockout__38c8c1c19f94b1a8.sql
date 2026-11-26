CREATE OR REPLACE FUNCTION public.clear_login_lockout(_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email  text := lower(btrim(coalesce(_email, '')));
  v_caller text := lower(btrim(coalesce(auth.email(), '')));
  v_role   text := coalesce(auth.role(), current_user);
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'e-mail obrigatorio' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    v_role = 'service_role'
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (v_caller <> '' AND v_caller = v_email)
  ) THEN
    RAISE EXCEPTION 'sem permissao para limpar o bloqueio de outra conta'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.account_lockouts
  SET failed_attempts = 0,
      locked_until = NULL,
      updated_at = now()
  WHERE email = v_email;
END;
$function$
