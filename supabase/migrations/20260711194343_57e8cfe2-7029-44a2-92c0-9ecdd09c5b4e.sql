
-- 1. Função de normalização E.164 (Brasil-first, aceita internacional)
CREATE OR REPLACE FUNCTION public.normalize_phone_br(_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  digits text;
BEGIN
  IF _raw IS NULL OR btrim(_raw) = '' THEN
    RETURN NULL;
  END IF;

  -- Extrai apenas dígitos
  digits := regexp_replace(_raw, '\D', '', 'g');

  IF digits = '' THEN
    RETURN NULL;
  END IF;

  -- Já tem código de país (12-15 dígitos) → assume internacional
  IF length(digits) BETWEEN 12 AND 15 THEN
    RETURN '+' || digits;
  END IF;

  -- 10 dígitos (DD + fixo 8) ou 11 dígitos (DD + celular 9) → prefixa Brasil
  IF length(digits) IN (10, 11) THEN
    RETURN '+55' || digits;
  END IF;

  -- Formatos inválidos: retorna null para não corromper
  RETURN NULL;
END;
$$;

-- 2. Trigger genérico
CREATE OR REPLACE FUNCTION public.tg_normalize_phone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'fornecedores' THEN
    NEW.telefone := public.normalize_phone_br(NEW.telefone);
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    NEW.phone := public.normalize_phone_br(NEW.phone);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_phone_fornecedores ON public.fornecedores;
CREATE TRIGGER trg_normalize_phone_fornecedores
  BEFORE INSERT OR UPDATE OF telefone ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_phone();

DROP TRIGGER IF EXISTS trg_normalize_phone_profiles ON public.profiles;
CREATE TRIGGER trg_normalize_phone_profiles
  BEFORE INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_phone();

-- 3. Backfill (sem disparar triggers desnecessários em quem já está OK)
UPDATE public.fornecedores
   SET telefone = public.normalize_phone_br(telefone)
 WHERE telefone IS NOT NULL
   AND telefone IS DISTINCT FROM public.normalize_phone_br(telefone);

UPDATE public.profiles
   SET phone = public.normalize_phone_br(phone)
 WHERE phone IS NOT NULL
   AND phone IS DISTINCT FROM public.normalize_phone_br(phone);

-- 4. CHECK constraints (NOT VALID para não travar dados históricos inválidos)
ALTER TABLE public.fornecedores
  DROP CONSTRAINT IF EXISTS fornecedores_telefone_e164_chk;
ALTER TABLE public.fornecedores
  ADD CONSTRAINT fornecedores_telefone_e164_chk
  CHECK (telefone IS NULL OR telefone ~ '^\+[1-9]\d{9,14}$') NOT VALID;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_e164_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_e164_chk
  CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{9,14}$') NOT VALID;

-- 5. Índices para busca/dedup rápida
CREATE INDEX IF NOT EXISTS idx_fornecedores_telefone
  ON public.fornecedores (telefone) WHERE telefone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_phone
  ON public.profiles (phone) WHERE phone IS NOT NULL;
