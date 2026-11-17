-- Religa o cadastro de novos usuarios.
--
-- Causa 1: o trigger `on_auth_user_created` (migration 20251216163227) nunca foi
-- aplicado em producao. A funcao `handle_new_user()` existia, mas nada a chamava,
-- entao todo signup via `supabase.auth.signUp` criava o usuario em auth.users sem
-- a linha correspondente em `profiles` nem em `user_roles`.
--
-- Causa 2: ao religar o trigger, o INSERT em `user_roles` dispara
-- `audit_user_roles_changes()`, que usava o UUID-zero como fallback de tenant.
-- `audit_logs.tenant_id` e NOT NULL e tem FK para `tenants`, e esse UUID nao
-- existe la, entao o cadastro inteiro falhava com 23503.
--
-- Causa 3: `handle_new_user()` criava o profile sem `tenant_id` nem
-- `current_organization_id`, deixando o usuario novo invisivel para as policies
-- de RLS multi-tenant. O sistema e single-tenant hoje (1 tenant, 1 organization),
-- entao o default e deterministico; com mais de um, nada e preenchido e a
-- atribuicao fica a cargo do admin.

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
  VALUES (NEW.id, 'buyer')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auditoria de role nunca deve derrubar a operacao auditada.
CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_email text;
  v_target_email text;
  v_tenant uuid;
  v_action audit_action_type;
  v_old jsonb;
  v_new jsonb;
  v_target uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create'; v_target := NEW.user_id;
    v_new := jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update'; v_target := NEW.user_id;
    v_old := jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role);
    v_new := jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role);
    IF OLD.role IS NOT DISTINCT FROM NEW.role AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id THEN
      RETURN NEW;
    END IF;
  ELSE
    v_action := 'delete'; v_target := OLD.user_id;
    v_old := jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role);
  END IF;

  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;
  SELECT email, tenant_id INTO v_target_email, v_tenant
    FROM public.profiles WHERE user_id = v_target LIMIT 1;

  IF v_tenant IS NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.profiles WHERE user_id = v_actor LIMIT 1;
  END IF;
  IF v_tenant IS NULL AND (SELECT count(*) FROM public.tenants) = 1 THEN
    SELECT id INTO v_tenant FROM public.tenants LIMIT 1;
  END IF;

  -- audit_logs.tenant_id e NOT NULL + FK para tenants: sem tenant resolvivel nao
  -- existe linha valida a gravar. Registra no log do Postgres e segue, em vez de
  -- abortar a transacao que criou/alterou o role.
  IF v_tenant IS NULL THEN
    RAISE LOG 'audit_user_roles_changes: tenant nao resolvido para user %, auditoria ignorada', v_target;
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.audit_logs (
    user_id, user_email, user_name, action_type, entity_type,
    entity_id, entity_description, old_values, new_values, metadata, tenant_id
  ) VALUES (
    v_actor, COALESCE(v_actor_email, 'system'), 'user_roles_trigger', v_action, 'usuario',
    v_target::text,
    format('Role %s: %s (alvo=%s)', TG_OP, COALESCE(NEW.role::text, OLD.role::text), COALESCE(v_target_email, v_target::text)),
    v_old, v_new,
    jsonb_build_object('source', 'user_roles_audit', 'op', TG_OP, 'target_user_id', v_target, 'target_email', v_target_email),
    v_tenant
  );

  RETURN COALESCE(NEW, OLD);
END;
$fn$;

COMMIT;