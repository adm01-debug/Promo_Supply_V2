CREATE OR REPLACE FUNCTION public.auto_calculate_delivery_penalty()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract RECORD;
  v_days_late integer;
  v_penalty_pct numeric;
  v_penalty_val numeric;
  v_tem_vinculo boolean;
BEGIN
  IF NEW.status = 'entregue' AND OLD.status != 'entregue'
     AND NEW.data_entrega IS NOT NULL AND NEW.data_previsao IS NOT NULL
     AND NEW.data_entrega > NEW.data_previsao THEN

    FOR v_contract IN
      SELECT c.* FROM contracts c
      WHERE c.supplier_id = NEW.fornecedor_id::text
        AND c.status = 'active'
        AND c.sla_delivery_days IS NOT NULL
      ORDER BY c.created_at DESC LIMIT 1
    LOOP
      v_days_late := (NEW.data_entrega - NEW.data_previsao);
      v_penalty_pct := LEAST(
        v_days_late * COALESCE(v_contract.penalty_rate_per_day, 0.5),
        COALESCE(v_contract.penalty_cap_percent, 20)
      );
      v_penalty_val := ROUND(NEW.valor_total * v_penalty_pct / 100, 2);

      IF v_penalty_val > 0 THEN
        INSERT INTO contract_penalties (
          contract_id, pedido_id, penalty_type, description,
          days_late, penalty_percent, penalty_value, status, tenant_id
        ) VALUES (
          v_contract.id, NEW.id, 'delivery_delay',
          'Multa por atraso: ' || v_days_late || ' dia(s) de atraso no pedido ' || NEW.numero ||
          '. Taxa: ' || v_penalty_pct || '% sobre R$ ' || NEW.valor_total,
          v_days_late, v_penalty_pct, v_penalty_val, 'pending', NEW.tenant_id
        );

        SELECT (EXISTS (SELECT 1 FROM public.user_tenants)
             OR EXISTS (SELECT 1 FROM public.profiles pf WHERE pf.tenant_id IS NOT NULL))
          INTO v_tem_vinculo;

        INSERT INTO notifications (user_id, title, message, type, priority, tenant_id)
        SELECT ur.user_id,
          'Multa aplicada: ' || NEW.numero,
          'Pedido ' || NEW.numero || ' entregue com ' || v_days_late || ' dia(s) de atraso. Multa de R$ ' || v_penalty_val || ' (' || v_penalty_pct || '%) aplicada automaticamente.',
          'contract_penalty', 'high', NEW.tenant_id
        FROM user_roles ur
        WHERE ur.role IN ('admin', 'coordinator', 'finance')
          AND (
            v_tem_vinculo = false
            OR EXISTS (
              SELECT 1 FROM public.user_tenants ut
              WHERE ut.user_id = ur.user_id AND ut.tenant_id = NEW.tenant_id
            )
            OR EXISTS (
              SELECT 1 FROM public.profiles pf
              WHERE (pf.user_id = ur.user_id OR pf.id = ur.user_id)
                AND pf.tenant_id = NEW.tenant_id
            )
          );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$
