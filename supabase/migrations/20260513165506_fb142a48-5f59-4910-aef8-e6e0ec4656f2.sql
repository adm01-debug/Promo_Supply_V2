-- 1. Garantir que a coluna tenant_id existe em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 2. Migrar perfis existentes para o tenant legacy
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- 3. Atualizar função current_tenant_id com search_path seguro e performance melhorada
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
  v_claims jsonb;
BEGIN
  -- 1. Tenta pegar de claim custom no JWT (mais rápido, evita query)
  v_claims := current_setting('request.jwt.claims', true)::jsonb;
  v_tenant := nullif(v_claims ->> 'tenant_id', '')::uuid;
  
  IF v_tenant IS NOT NULL THEN
    RETURN v_tenant;
  END IF;

  -- 2. Fallback: tenant default do usuário (cached via STABLE function)
  SELECT tenant_id INTO v_tenant
  FROM public.user_tenants
  WHERE user_id = auth.uid() AND is_default = true
  LIMIT 1;
  
  RETURN v_tenant;
END;
$$;

-- 4. Criar política de RLS para profiles (evitando recursão)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_tenant_isolation" ON public.profiles;
CREATE POLICY "profiles_tenant_isolation" ON public.profiles
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid() AND is_default = true LIMIT 1));

-- 5. Vincular a coluna organization_id (legada) ao tenant_id se necessário
-- Ajustado para lidar com o tipo UUID da coluna current_organization_id
UPDATE public.profiles 
SET current_organization_id = tenant_id 
WHERE current_organization_id IS NULL AND tenant_id IS NOT NULL;
