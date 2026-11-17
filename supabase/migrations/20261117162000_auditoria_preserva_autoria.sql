-- Corrige regressao introduzida ao ligar tr_enforce_audit_integrity:
-- na versao original, qualquer insert sem sessao (service role / cron) tinha
-- user_id e organization_id zerados a forca, apagando a autoria que a edge
-- function informou (ex.: supabase/functions/dependency-health/index.ts:627).
-- Agora a identidade so e sobrescrita quando ha usuario autenticado (anti-forja);
-- sem sessao, a autoria informada pelo chamador e preservada.
CREATE OR REPLACE FUNCTION public.enforce_audit_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    actual_user_id uuid;
    actual_org_id uuid;
BEGIN
    actual_user_id := auth.uid();

    IF actual_user_id IS NOT NULL THEN
        SELECT current_organization_id INTO actual_org_id
        FROM public.profiles
        WHERE user_id = actual_user_id;

        NEW.user_id := actual_user_id;
        NEW.organization_id := actual_org_id;

        IF NEW.user_email IS NULL OR NEW.user_email = 'sistema@promo.supply' THEN
            SELECT email INTO NEW.user_email FROM auth.users WHERE id = actual_user_id;
        END IF;
    ELSE
        NEW.user_email := COALESCE(NEW.user_email, 'sistema@promo.supply');
        NEW.user_name  := COALESCE(NEW.user_name, 'Sistema');
    END IF;

    RETURN NEW;
END;
$fn$;