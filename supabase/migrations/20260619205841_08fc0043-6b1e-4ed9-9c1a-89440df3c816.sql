
-- 1) ESTENDER organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS cnpj_matriz text,
  ADD COLUMN IF NOT EXISTS razao_social text;

-- 2) ESTENDER tenants
DO $$ BEGIN
  CREATE TYPE public.regime_tributario AS ENUM ('simples_nacional','lucro_presumido','lucro_real','mei');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS regime_tributario public.regime_tributario,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS inscricao_municipal text,
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS endereco_fiscal jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cor_identificacao text DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS empresa_codigo text;

CREATE INDEX IF NOT EXISTS idx_tenants_organization_id ON public.tenants(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenants_regime ON public.tenants(regime_tributario);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS empresa_default_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- 4) BACKFILL
DO $$
DECLARE v_default_org uuid;
BEGIN
  SELECT id INTO v_default_org FROM public.organizations ORDER BY created_at NULLS LAST LIMIT 1;
  IF v_default_org IS NULL THEN
    INSERT INTO public.organizations(name, slug, razao_social)
    VALUES ('Grupo Principal', 'grupo-principal', 'Grupo Principal Ltda')
    RETURNING id INTO v_default_org;
  END IF;

  UPDATE public.tenants SET organization_id = v_default_org WHERE organization_id IS NULL;

  INSERT INTO public.user_organizations(user_id, organization_id, role)
  SELECT p.user_id, v_default_org, 'member'
  FROM public.profiles p
  WHERE NOT EXISTS (SELECT 1 FROM public.user_organizations uo WHERE uo.user_id = p.user_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles SET current_organization_id = v_default_org WHERE current_organization_id IS NULL;
END $$;

-- 5) user_tenants (usa default 'viewer')
INSERT INTO public.user_tenants(user_id, tenant_id)
SELECT DISTINCT p.user_id, t.id
FROM public.profiles p
JOIN public.tenants t ON t.organization_id = p.current_organization_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_tenants ut WHERE ut.user_id = p.user_id AND ut.tenant_id = t.id
)
ON CONFLICT DO NOTHING;

-- 6) FUNÇÕES
CREATE OR REPLACE FUNCTION public.get_user_grupo_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.tenant_in_my_group(_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = _tenant_id AND t.organization_id = public.get_user_grupo_id());
$$;

CREATE OR REPLACE FUNCTION public.tenants_in_my_group()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.tenants WHERE organization_id = public.get_user_grupo_id();
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.tenant_in_my_group(NULLIF(auth.jwt() ->> 'tenant_id','')::uuid)
      THEN NULLIF(auth.jwt() ->> 'tenant_id','')::uuid
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_grupo_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_in_my_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenants_in_my_group() TO authenticated;

-- 7) Policies PURAS
DO $$
DECLARE
  pol RECORD;
  v_p1 text := '(tenant_id = current_tenant_id())';
  v_p2 text := '(tenant_id = ((auth.jwt() ->> ''tenant_id''::text))::uuid)';
BEGIN
  FOR pol IN
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname='public'
      AND (qual IN (v_p1,v_p2) OR with_check IN (v_p1,v_p2)
           OR (qual IS NULL AND with_check IN (v_p1,v_p2)))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    IF pol.cmd='INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.tenant_in_my_group(tenant_id))', pol.policyname, pol.tablename);
    ELSIF pol.cmd='SELECT' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.tenant_in_my_group(tenant_id))', pol.policyname, pol.tablename);
    ELSIF pol.cmd='UPDATE' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id))', pol.policyname, pol.tablename);
    ELSIF pol.cmd='DELETE' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.tenant_in_my_group(tenant_id))', pol.policyname, pol.tablename);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id))', pol.policyname, pol.tablename);
    END IF;
  END LOOP;
END $$;

-- 8) Policies COMPOSTAS
DO $$
DECLARE
  pol RECORD; v_q text; v_c text;
BEGIN
  FOR pol IN
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname='public'
      AND (qual LIKE '%(tenant_id = current_tenant_id())%' OR with_check LIKE '%(tenant_id = current_tenant_id())%')
      AND COALESCE(qual,'') NOT IN ('(tenant_id = current_tenant_id())')
      AND COALESCE(with_check,'') NOT IN ('(tenant_id = current_tenant_id())')
  LOOP
    v_q := replace(COALESCE(pol.qual,''), '(tenant_id = current_tenant_id())', 'public.tenant_in_my_group(tenant_id)');
    v_c := replace(COALESCE(pol.with_check,''), '(tenant_id = current_tenant_id())', 'public.tenant_in_my_group(tenant_id)');
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    IF pol.cmd='SELECT' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', pol.policyname, pol.tablename, v_q);
    ELSIF pol.cmd='INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', pol.policyname, pol.tablename, v_c);
    ELSIF pol.cmd='UPDATE' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', pol.policyname, pol.tablename, v_q, COALESCE(NULLIF(v_c,''), v_q));
    ELSIF pol.cmd='DELETE' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', pol.policyname, pol.tablename, v_q);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)', pol.policyname, pol.tablename, v_q, COALESCE(NULLIF(v_c,''), v_q));
    END IF;
  END LOOP;
END $$;

-- 9) Trigger acesso automatico
CREATE OR REPLACE FUNCTION public.grant_tenant_access_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    INSERT INTO public.user_tenants(user_id, tenant_id)
    SELECT p.user_id, NEW.id
    FROM public.profiles p
    WHERE p.current_organization_id = NEW.organization_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_grant_tenant_access ON public.tenants;
CREATE TRIGGER trg_grant_tenant_access
AFTER INSERT OR UPDATE OF organization_id ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.grant_tenant_access_on_insert();

-- 10) aliquotas_tributarias
CREATE TABLE IF NOT EXISTS public.aliquotas_tributarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  regime public.regime_tributario NOT NULL,
  uf_origem text, uf_destino text, ncm text,
  icms numeric(6,4) DEFAULT 0, pis numeric(6,4) DEFAULT 0,
  cofins numeric(6,4) DEFAULT 0, iss numeric(6,4) DEFAULT 0, ipi numeric(6,4) DEFAULT 0,
  vigencia_inicio date NOT NULL DEFAULT CURRENT_DATE, vigencia_fim date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aliquotas_lookup ON public.aliquotas_tributarias(organization_id, regime, uf_destino, ncm);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aliquotas_tributarias TO authenticated;
GRANT ALL ON public.aliquotas_tributarias TO service_role;

ALTER TABLE public.aliquotas_tributarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Grupo ve suas aliquotas" ON public.aliquotas_tributarias;
CREATE POLICY "Grupo ve suas aliquotas" ON public.aliquotas_tributarias
  FOR SELECT TO authenticated USING (organization_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS "Admin coord gerencia aliquotas" ON public.aliquotas_tributarias;
CREATE POLICY "Admin coord gerencia aliquotas" ON public.aliquotas_tributarias
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_grupo_id() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'coordinator'::app_role)))
  WITH CHECK (organization_id = public.get_user_grupo_id() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'coordinator'::app_role)));

DROP TRIGGER IF EXISTS trg_aliquotas_updated_at ON public.aliquotas_tributarias;
CREATE TRIGGER trg_aliquotas_updated_at
BEFORE UPDATE ON public.aliquotas_tributarias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
