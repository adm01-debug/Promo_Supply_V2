-- 1. Enum de Status de Tenant
DO $$ BEGIN
    CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'trial', 'churned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela de Tenants (Organizações)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  status tenant_status NOT NULL DEFAULT 'trial',
  plan TEXT NOT NULL DEFAULT 'starter',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Membership (Usuário <-> Tenant)
CREATE TABLE IF NOT EXISTS public.user_tenants (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  is_default BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tenants_one_default ON public.user_tenants(user_id) WHERE is_default = true;

-- 5. Função para resolver Tenant Atual via JWT ou Fallback
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
BEGIN
  -- Tenta pegar do claim customizado no JWT (mais seguro)
  v_tenant := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid;
  IF v_tenant IS NOT NULL THEN
    RETURN v_tenant;
  END IF;
  
  -- Fallback: tenant marcado como default do usuário
  SELECT tenant_id INTO v_tenant
  FROM public.user_tenants
  WHERE user_id = auth.uid() AND is_default = true
  LIMIT 1;
  
  RETURN v_tenant;
END;
$$;

-- 6. Ativar RLS nas tabelas de gestão de tenant
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de acesso
DROP POLICY IF EXISTS "tenants visible to members" ON public.tenants;
CREATE POLICY "tenants visible to members"
  ON public.tenants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = auth.uid() AND tenant_id = public.tenants.id
  ));

DROP POLICY IF EXISTS "user_tenants own rows" ON public.user_tenants;
CREATE POLICY "user_tenants own rows"
  ON public.user_tenants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 8. Adicionar tenant_id em tabelas de domínio (Fase 1: Principais)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solicitacoes' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.solicitacoes ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.pedidos ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fornecedores' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.fornecedores ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    END IF;
END $$;

-- 9. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
