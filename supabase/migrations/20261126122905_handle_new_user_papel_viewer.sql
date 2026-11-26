-- AUT-02 / etapa 007: o autocadastro em /auth entregava acesso de comprador.
--
-- Causa: o trigger on_auth_user_created -> handle_new_user() (ultima versao em
-- supabase/migrations/20261117150000_religa_cadastro_de_usuarios.sql) insere em
-- public.user_roles com papel fixo 'buyer'. Como a instalacao e single-tenant
-- (1 tenant, 1 organization), quem se cadastrasse pela aba "Criar Conta" de
-- /auth ja saia vinculado ao grupo real de producao E com papel de comprador,
-- que a RLS libera para escrita em pedidos, cotacoes, fornecedores, produtos,
-- devolucoes e estoque (docs/contexto/supabase/policies.md). Nao havia convite
-- nem aprovacao entre o cadastro e o acesso.
--
-- Correcao: o papel padrao passa a ser 'viewer' (valor existente no enum
-- public.app_role desde 20251216162747), o mesmo default que
-- sso_configurations.default_role ja usa. O usuario novo enxerga o que a RLS
-- permite a viewer e so ganha permissao de comprador quando um admin atribuir.
--
-- O corpo da funcao e byte a byte o da migration 20261117150000; a unica
-- diferenca e o literal do papel. on_auth_user_created continua igual e a linha
-- em profiles continua sendo criada (sem ela get_user_grupo_id() devolve NULL e
-- toda policy tenant_in_my_group negaria - o app ficaria vazio).
--
-- Nao altera usuarios ja existentes: quem entrou antes mantem o papel atual.
-- Reversao: supabase/rollbacks/20261126122905_revert_handle_new_user_papel_viewer.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_tenant uuid;
  v_org    uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.tenants LIMIT 2;
  IF (SELECT count(*) FROM public.tenants) <> 1 THEN
    v_tenant := NULL;
  END IF;

  SELECT id INTO v_org FROM public.organizations LIMIT 2;
  IF (SELECT count(*) FROM public.organizations) <> 1 THEN
    v_org := NULL;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email, tenant_id, current_organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    v_tenant,
    v_org
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$fn$;

COMMIT;
