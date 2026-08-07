
-- 1) Função de validação de CNPJ (módulo 11)
CREATE OR REPLACE FUNCTION public.is_valid_cnpj(_cnpj text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  digits text;
  d int[];
  sum1 int := 0; sum2 int := 0;
  d1 int; d2 int;
  weights1 int[] := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
  weights2 int[] := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
  i int;
BEGIN
  IF _cnpj IS NULL THEN RETURN false; END IF;
  digits := regexp_replace(_cnpj, '\D', '', 'g');
  IF length(digits) <> 14 THEN RETURN false; END IF;
  -- rejeita sequências repetidas (00000000000000, 11111111111111, ...)
  IF digits ~ '^(\d)\1{13}$' THEN RETURN false; END IF;

  d := ARRAY(SELECT (substring(digits FROM g FOR 1))::int FROM generate_series(1,14) g);
  FOR i IN 1..12 LOOP sum1 := sum1 + d[i]*weights1[i]; END LOOP;
  d1 := 11 - (sum1 % 11);
  IF d1 >= 10 THEN d1 := 0; END IF;
  IF d1 <> d[13] THEN RETURN false; END IF;

  FOR i IN 1..13 LOOP sum2 := sum2 + d[i]*weights2[i]; END LOOP;
  d2 := 11 - (sum2 % 11);
  IF d2 >= 10 THEN d2 := 0; END IF;
  RETURN d2 = d[14];
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_valid_cnpj(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_valid_cnpj(text) TO authenticated, service_role;

-- 2) Trigger de normalização — mantém apenas dígitos
CREATE OR REPLACE FUNCTION public.normalize_cnpj_digits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.cnpj IS NOT NULL THEN
    NEW.cnpj := regexp_replace(NEW.cnpj, '\D', '', 'g');
    IF NEW.cnpj = '' THEN NEW.cnpj := NULL; END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.normalize_cnpj_digits() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.normalize_cnpj_digits() TO authenticated, service_role;

-- 3) Backfill: normaliza dados existentes
UPDATE public.fornecedores SET cnpj = regexp_replace(cnpj, '\D', '', 'g')
  WHERE cnpj IS NOT NULL AND cnpj ~ '\D';
UPDATE public.tenants SET cnpj = regexp_replace(cnpj, '\D', '', 'g')
  WHERE cnpj IS NOT NULL AND cnpj ~ '\D';

-- 4) Triggers
DROP TRIGGER IF EXISTS trg_normalize_cnpj ON public.fornecedores;
CREATE TRIGGER trg_normalize_cnpj BEFORE INSERT OR UPDATE OF cnpj ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.normalize_cnpj_digits();

DROP TRIGGER IF EXISTS trg_normalize_cnpj ON public.tenants;
CREATE TRIGGER trg_normalize_cnpj BEFORE INSERT OR UPDATE OF cnpj ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.normalize_cnpj_digits();

-- 5) CHECK constraints NOT VALID — bloqueia novos inválidos, poupa históricos
ALTER TABLE public.fornecedores DROP CONSTRAINT IF EXISTS fornecedores_cnpj_valid;
ALTER TABLE public.fornecedores
  ADD CONSTRAINT fornecedores_cnpj_valid
  CHECK (cnpj IS NULL OR public.is_valid_cnpj(cnpj)) NOT VALID;

ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_cnpj_valid;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_cnpj_valid
  CHECK (cnpj IS NULL OR public.is_valid_cnpj(cnpj)) NOT VALID;

-- 6) Unicidade: CNPJ por tenant (fornecedores) e global (tenants)
-- fornecedores: unique parcial por (tenant_id, cnpj)
CREATE UNIQUE INDEX IF NOT EXISTS uq_fornecedores_tenant_cnpj
  ON public.fornecedores (tenant_id, cnpj)
  WHERE cnpj IS NOT NULL;

-- tenants: CNPJ único global (empresa)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_cnpj
  ON public.tenants (cnpj)
  WHERE cnpj IS NOT NULL;

COMMENT ON FUNCTION public.is_valid_cnpj(text) IS
  'Valida CNPJ via dígito verificador módulo 11. Rejeita sequências repetidas.';
