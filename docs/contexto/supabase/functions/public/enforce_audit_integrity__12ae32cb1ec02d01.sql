CREATE OR REPLACE FUNCTION public.enforce_audit_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    actual_user_id uuid;
    actual_org_id uuid;
BEGIN
    actual_user_id := auth.uid();

    IF actual_user_id IS NOT NULL THEN
        -- Usuario autenticado: forca a identidade real, impedindo forja de autoria.
        SELECT current_organization_id INTO actual_org_id
        FROM public.profiles
        WHERE user_id = actual_user_id;

        NEW.user_id := actual_user_id;
        NEW.organization_id := actual_org_id;

        IF NEW.user_email IS NULL OR NEW.user_email = 'sistema@promo.supply' THEN
            SELECT email INTO NEW.user_email FROM auth.users WHERE id = actual_user_id;
        END IF;
    ELSE
        -- Sem sessao (service role / cron): preserva a autoria informada pelo
        -- chamador e so aplica rotulo de sistema quando nada foi informado.
        NEW.user_email := COALESCE(NEW.user_email, 'sistema@promo.supply');
        NEW.user_name  := COALESCE(NEW.user_name, 'Sistema');
    END IF;

    RETURN NEW;
END;
$function$
