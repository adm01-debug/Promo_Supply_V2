
-- 1) Função utilitária de normalização
CREATE OR REPLACE FUNCTION public.normalize_email_lowercase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    NEW.email := lower(btrim(NEW.email));
    IF NEW.phone IS NOT NULL THEN
      NEW.phone := btrim(NEW.phone);
    END IF;
  ELSIF TG_TABLE_NAME = 'fornecedores' THEN
    IF NEW.email IS NOT NULL THEN NEW.email := lower(btrim(NEW.email)); END IF;
  ELSE
    NEW.email := lower(btrim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.normalize_email_lowercase() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.normalize_email_lowercase() TO authenticated, service_role;

-- 2) Backfill: normalizar dados existentes (idempotente)
UPDATE public.profiles                SET email = lower(btrim(email)) WHERE email IS NOT NULL AND email <> lower(btrim(email));
UPDATE public.login_attempts          SET email = lower(btrim(email)) WHERE email IS NOT NULL AND email <> lower(btrim(email));
UPDATE public.password_reset_requests SET email = lower(btrim(email)) WHERE email IS NOT NULL AND email <> lower(btrim(email));
UPDATE public.account_lockouts        SET email = lower(btrim(email)) WHERE email IS NOT NULL AND email <> lower(btrim(email));
UPDATE public.fornecedores            SET email = lower(btrim(email)) WHERE email IS NOT NULL AND email <> lower(btrim(email));
UPDATE public.webauthn_challenges     SET email = lower(btrim(email)) WHERE email IS NOT NULL AND email <> lower(btrim(email));

-- 3) Triggers BEFORE INSERT OR UPDATE OF email — só disparam se email mudar
DROP TRIGGER IF EXISTS trg_normalize_email ON public.profiles;
CREATE TRIGGER trg_normalize_email BEFORE INSERT OR UPDATE OF email, phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_lowercase();

DROP TRIGGER IF EXISTS trg_normalize_email ON public.login_attempts;
CREATE TRIGGER trg_normalize_email BEFORE INSERT OR UPDATE OF email ON public.login_attempts
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_lowercase();

DROP TRIGGER IF EXISTS trg_normalize_email ON public.password_reset_requests;
CREATE TRIGGER trg_normalize_email BEFORE INSERT OR UPDATE OF email ON public.password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_lowercase();

DROP TRIGGER IF EXISTS trg_normalize_email ON public.account_lockouts;
CREATE TRIGGER trg_normalize_email BEFORE INSERT OR UPDATE OF email ON public.account_lockouts
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_lowercase();

DROP TRIGGER IF EXISTS trg_normalize_email ON public.fornecedores;
CREATE TRIGGER trg_normalize_email BEFORE INSERT OR UPDATE OF email ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_lowercase();

DROP TRIGGER IF EXISTS trg_normalize_email ON public.webauthn_challenges;
CREATE TRIGGER trg_normalize_email BEFORE INSERT OR UPDATE OF email ON public.webauthn_challenges
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_lowercase();

-- 4) Índices funcionais para lookups case-insensitive (não-únicos por segurança)
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower                ON public.profiles                (lower(email));
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_lower          ON public.login_attempts          (lower(email));
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email_lower ON public.password_reset_requests (lower(email));
CREATE INDEX IF NOT EXISTS idx_account_lockouts_email_lower        ON public.account_lockouts        (lower(email));
CREATE INDEX IF NOT EXISTS idx_fornecedores_email_lower            ON public.fornecedores            (lower(email)) WHERE email IS NOT NULL;

COMMENT ON FUNCTION public.normalize_email_lowercase() IS
  'Trigger BEFORE INSERT/UPDATE: normaliza email para lowercase+trim. Previne duplicatas por case e bypass de rate-limit.';
