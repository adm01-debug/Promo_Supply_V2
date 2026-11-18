CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
