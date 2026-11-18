CREATE OR REPLACE FUNCTION public.auto_approve_low_value_solicitacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
BEGIN
  -- Auto-approve if valor_estimado < 1000 and status is pendente
  IF NEW.status = 'pendente' AND NEW.valor_estimado IS NOT NULL AND NEW.valor_estimado < 1000 THEN
    NEW.status := 'aprovada';

    -- tenant real (o front manda o organization_id em tenant_id; a_fill_tenant_id corrige quando há
    -- auth.uid(), mas sem sessão o valor pode continuar sendo o id da organização)
    v_tenant := COALESCE(
      (SELECT t.id FROM public.tenants t WHERE t.id = NEW.tenant_id),
      (SELECT t.id FROM public.tenants t
        WHERE t.organization_id = COALESCE(NEW.organization_id, NEW.tenant_id)
        ORDER BY t.created_at LIMIT 1)
    );

    -- Create notification for the requester
    INSERT INTO public.notifications (user_id, title, message, type, priority, tenant_id)
    SELECT NEW.solicitante_id,
           'Solicitação auto-aprovada',
           'A solicitação #' || NEW.numero || ' foi aprovada automaticamente (valor < R$ 1.000)',
           'approval',
           'normal',
           v_tenant
    WHERE NEW.solicitante_id IS NOT NULL AND v_tenant IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$function$
