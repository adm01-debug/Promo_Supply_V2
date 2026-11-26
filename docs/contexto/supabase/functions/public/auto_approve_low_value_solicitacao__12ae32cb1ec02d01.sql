CREATE OR REPLACE FUNCTION public.auto_approve_low_value_solicitacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_limite_regra numeric;
  v_limite_centro numeric;
  v_limite numeric;
  v_limite_txt text;
BEGIN
  -- tenant real (o front manda o organization_id em tenant_id; a_fill_tenant_id corrige quando ha
  -- auth.uid(), mas sem sessao o valor pode continuar sendo o id da organizacao)
  v_tenant := COALESCE(
    (SELECT t.id FROM public.tenants t WHERE t.id = NEW.tenant_id),
    (SELECT t.id FROM public.tenants t
      WHERE t.organization_id = COALESCE(NEW.organization_id, NEW.tenant_id)
      ORDER BY t.created_at LIMIT 1)
  );

  IF NEW.status = 'pendente' AND NEW.valor_estimado IS NOT NULL THEN
    -- 1) piso da Matriz de Alcada do tenant/organizacao (sem regra ativa = sem piso)
    SELECT min(r.valor_min) INTO v_limite_regra
      FROM public.approval_rules r
     WHERE r.ativo
       AND ((v_tenant IS NOT NULL AND r.tenant_id = v_tenant)
         OR (NEW.organization_id IS NOT NULL AND r.organization_id = NEW.organization_id));

    -- 2) limite do centro de custo da solicitacao (0 ou nulo = nao configurado)
    IF NEW.cost_center_id IS NOT NULL THEN
      SELECT cc.approval_threshold INTO v_limite_centro
        FROM public.cost_centers cc
       WHERE cc.id = NEW.cost_center_id;
      IF v_limite_centro IS NOT NULL AND v_limite_centro <= 0 THEN
        v_limite_centro := NULL;
      END IF;
    END IF;

    -- 3) menor limite configurado vence; sem configuracao nenhuma, mantem o legado de R$ 1.000
    v_limite := least(
      COALESCE(v_limite_regra, v_limite_centro, 1000),
      COALESCE(v_limite_centro, v_limite_regra, 1000)
    );

    IF NEW.valor_estimado < v_limite THEN
      NEW.status := 'aprovada';
      v_limite_txt := 'R$ ' || replace(round(v_limite, 2)::text, '.', ',');

      -- Create notification for the requester
      INSERT INTO public.notifications (user_id, title, message, type, priority, tenant_id)
      SELECT NEW.solicitante_id,
             'Solicitação auto-aprovada',
             'A solicitação #' || NEW.numero || ' foi aprovada automaticamente (valor abaixo da alçada de ' || v_limite_txt || ')',
             'approval',
             'normal',
             v_tenant
      WHERE NEW.solicitante_id IS NOT NULL AND v_tenant IS NOT NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
