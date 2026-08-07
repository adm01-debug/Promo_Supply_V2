-- 1. Criar tipos e tabelas base de multi-tenancy
DO $$ BEGIN
    CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'trial', 'churned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  status public.tenant_status NOT NULL DEFAULT 'trial',
  plan TEXT NOT NULL DEFAULT 'starter',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.user_tenants (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  is_default BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tenants_one_default
  ON public.user_tenants(user_id) WHERE is_default = true;

-- 2. Funções de resolução de contexto
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
BEGIN
  -- 1. Tenta pegar de claim custom no JWT
  v_tenant := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid;
  IF v_tenant IS NOT NULL THEN
    RETURN v_tenant;
  END IF;
  -- 2. Fallback: tenant default do usuário
  SELECT tenant_id INTO v_tenant
  FROM public.user_tenants
  WHERE user_id = auth.uid() AND is_default = true
  LIMIT 1;
  RETURN v_tenant;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  );
$$;

-- 3. Habilitar RLS nas tabelas de gestão de tenant
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "tenants visible to members"
      ON public.tenants FOR SELECT TO authenticated
      USING (public.user_belongs_to_tenant(auth.uid(), id));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "user_tenants own rows"
      ON public.user_tenants FOR SELECT TO authenticated
      USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Criar tenant default para dados legados
INSERT INTO public.tenants (id, slug, name, status, plan)
VALUES ('00000000-0000-0000-0000-000000000000', 'legacy', 'Legacy Organization', 'active', 'enterprise')
ON CONFLICT (id) DO NOTHING;

-- 5. Associar todos os usuários existentes ao tenant legacy como default
INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
SELECT id, '00000000-0000-0000-0000-000000000000', 'admin', true
FROM auth.users
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 6. Adicionar tenant_id às tabelas de domínio corrigidas
DO $$ 
DECLARE
    t_name text;
    tables_to_migrate text[] := ARRAY['fornecedores', 'pedidos', 'pedido_itens', 'solicitacoes', 'cotacoes', 'fiscal_documents', 'pagamentos', 'categorias', 'produtos'];
BEGIN
    FOREACH t_name IN ARRAY tables_to_migrate LOOP
        -- Verificar se a tabela existe antes de prosseguir
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
            -- Adicionar coluna permitindo null inicialmente
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id)', t_name);
            
            -- Atualizar dados nulos para o tenant legacy
            EXECUTE format('UPDATE public.%I SET tenant_id = ''00000000-0000-0000-0000-000000000000'' WHERE tenant_id IS NULL', t_name);
            
            -- Agora sim aplicar NOT NULL
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t_name);
            
            -- Criar índice
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', 'idx_' || t_name || '_tenant', t_name);
            
            -- Habilitar RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
            
            -- Recriar política de isolamento por tenant
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_isolation_' || t_name, t_name);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id())', 'tenant_isolation_' || t_name, t_name);
        END IF;
    END LOOP;
END $$;
