-- fix(banco): solicitação pequena volta a ser criada, entrega gera 1 pagamento e orçamento deixa de multiplicar
--
-- (a) notifications.tenant_id é NOT NULL (FK tenants): toda função que insere em notifications passa a
--     gravar tenant_id. Remove o gatilho duplicado de auto-aprovação em solicitacoes.
--     auto_calculate_delivery_penalty também gravava contract_penalties com o tenant default
--     '00000000-…' (FK violada), o que impedia marcar pedido como entregue.
-- (b) Um único criador de pagamento na entrega (auto_create_pagamento_on_delivery): idempotente,
--     com organization_id/tenant_id do pedido e número por generate_sequential_number('PAG', …),
--     o mesmo RPC que o front usa (src/hooks/usePagamentos.ts). trg_pedido_entregue_transition
--     deixa de criar pagamento.
-- (c) Um único gatilho de orçamento em solicitacoes (update_budget_on_solicitacao_change), que mexe
--     só na linha anual (mes IS NULL) e na linha do mês da solicitação.
-- (d) Um único gatilho de auditoria em pagamentos.
--
-- Idempotente: CREATE OR REPLACE / DROP ... IF EXISTS.

-- ---------------------------------------------------------------------------------------------
-- (a) Notificações com tenant_id
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_approve_low_value_solicitacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
$function$;

-- Dois gatilhos BEFORE INSERT idênticos chamavam a mesma função (2 notificações por solicitação).
DROP TRIGGER IF EXISTS auto_approve_low_value ON public.solicitacoes;
-- mantido: trg_auto_approve_low_value

CREATE OR REPLACE FUNCTION public.auto_block_low_score_supplier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_contract RECORD;
BEGIN
  IF NEW.avaliacao IS NOT NULL AND (OLD.avaliacao IS NULL OR NEW.avaliacao < OLD.avaliacao) THEN
    FOR v_contract IN
      SELECT c.* FROM contracts c
      WHERE c.supplier_id = NEW.id::text
        AND c.status = 'active'
        AND c.auto_block_below_score = true
        AND c.min_supplier_score IS NOT NULL
    LOOP
      IF NEW.avaliacao < v_contract.min_supplier_score THEN
        -- Block supplier
        UPDATE fornecedores SET status = 'bloqueado', updated_at = now() WHERE id = NEW.id;

        -- Notify
        INSERT INTO notifications (user_id, title, message, type, priority, tenant_id)
        SELECT ur.user_id,
          'Fornecedor bloqueado: ' || NEW.razao_social,
          'O fornecedor ' || NEW.razao_social || ' foi bloqueado automaticamente. Score: ' ||
          NEW.avaliacao || ' (mínimo contratual: ' || v_contract.min_supplier_score || ').',
          'supplier_blocked', 'critical', NEW.tenant_id
        FROM user_roles ur WHERE ur.role IN ('admin', 'coordinator');

        EXIT; -- One block is enough
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_calculate_delivery_penalty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_contract RECORD;
  v_days_late integer;
  v_penalty_pct numeric;
  v_penalty_val numeric;
BEGIN
  IF NEW.status = 'entregue' AND OLD.status != 'entregue'
     AND NEW.data_entrega IS NOT NULL AND NEW.data_previsao IS NOT NULL
     AND NEW.data_entrega > NEW.data_previsao THEN

    -- Find active contract for this supplier
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

        -- Notify admins
        INSERT INTO notifications (user_id, title, message, type, priority, tenant_id)
        SELECT ur.user_id,
          'Multa aplicada: ' || NEW.numero,
          'Pedido ' || NEW.numero || ' entregue com ' || v_days_late || ' dia(s) de atraso. Multa de R$ ' || v_penalty_val || ' (' || v_penalty_pct || '%) aplicada automaticamente.',
          'contract_penalty', 'high', NEW.tenant_id
        FROM user_roles ur WHERE ur.role IN ('admin', 'coordinator', 'finance');
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- notifications não tem coluna "metadata" (é "data") e exige tenant_id: tenant padrão do dono do segredo.
CREATE OR REPLACE FUNCTION public.check_secret_rotation_due()
RETURNS TABLE(notified_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  r record; v_days int; v_bucket text; v_count int := 0;
  v_start timestamptz := clock_timestamp();
  v_tenant uuid;
BEGIN
  FOR r IN SELECT * FROM public.secret_rotation_schedule
           WHERE next_due_at <= now() + interval '30 days'
  LOOP
    v_days := GREATEST(0, EXTRACT(DAY FROM (r.next_due_at - now()))::int);
    v_bucket := CASE
      WHEN v_days <= 0 THEN 'overdue'
      WHEN v_days <= 1 THEN 'due_1d'
      WHEN v_days <= 7 THEN 'due_7d'
      ELSE 'due_30d'
    END;

    v_tenant := COALESCE(
      (SELECT ut.tenant_id FROM public.user_tenants ut
        WHERE ut.user_id = r.owner_user_id AND ut.is_default ORDER BY ut.joined_at LIMIT 1),
      (SELECT p.tenant_id FROM public.profiles p
        WHERE p.user_id = r.owner_user_id AND p.tenant_id IN (SELECT t.id FROM public.tenants t) LIMIT 1)
    );

    IF (r.last_notified_bucket IS DISTINCT FROM v_bucket
        OR r.last_notified_at IS NULL
        OR r.last_notified_at::date < now()::date)
       AND r.owner_user_id IS NOT NULL
       AND v_tenant IS NOT NULL
    THEN
      INSERT INTO public.notifications (user_id, type, title, message, priority, data, tenant_id)
      VALUES (
        r.owner_user_id, 'secret_rotation_due',
        CASE v_bucket
          WHEN 'overdue' THEN 'Segredo vencido: ' || r.secret_name
          WHEN 'due_1d'  THEN 'Rotação amanhã: ' || r.secret_name
          WHEN 'due_7d'  THEN 'Rotação em 7 dias: ' || r.secret_name
          ELSE 'Rotação em 30 dias: ' || r.secret_name
        END,
        COALESCE(r.description, r.secret_name) ||
          ' — próximo vencimento em ' || to_char(r.next_due_at, 'DD/MM/YYYY'),
        CASE v_bucket WHEN 'overdue' THEN 'urgent' WHEN 'due_1d' THEN 'high' ELSE 'medium' END,
        jsonb_build_object('secret_id', r.id, 'secret_name', r.secret_name,
                           'bucket', v_bucket, 'days_left', v_days),
        v_tenant
      );
      v_count := v_count + 1;

      UPDATE public.secret_rotation_schedule
      SET last_notified_at = now(), last_notified_bucket = v_bucket
      WHERE id = r.id;
    END IF;
  END LOOP;

  INSERT INTO public.health_scan_runs
    (started_at, finished_at, total_scanners, ok_count, failed_count, duration_ms, results)
  VALUES (v_start, clock_timestamp(), 1, 1, 0,
          EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start))::int,
          jsonb_build_object('scan','check_secret_rotation_due','notified',v_count));

  RETURN QUERY SELECT v_count;
END;
$function$;

-- ---------------------------------------------------------------------------------------------
-- (b) Um único criador de pagamento na entrega do pedido
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_create_pagamento_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_numero TEXT;
BEGIN
  IF NEW.status = 'entregue' AND OLD.status IS DISTINCT FROM 'entregue'
     AND NEW.fornecedor_id IS NOT NULL AND COALESCE(NEW.valor_total, 0) > 0
     AND NOT EXISTS (SELECT 1 FROM public.pagamentos WHERE pedido_id = NEW.id) THEN
    -- mesmo gerador (com advisory lock) que o front usa em usePagamentos.createPagamento
    v_numero := public.generate_sequential_number('PAG', 'pagamentos');

    INSERT INTO public.pagamentos (
      numero, pedido_id, fornecedor_id, valor, data_vencimento, status,
      organization_id, tenant_id
    ) VALUES (
      v_numero,
      NEW.id,
      NEW.fornecedor_id,
      NEW.valor_total,
      (CURRENT_DATE + INTERVAL '30 days')::date,
      'pendente',
      NEW.organization_id,
      NEW.tenant_id
    );
  END IF;
  RETURN NEW;
END;
$function$;
-- mantido: trg_auto_create_pagamento_on_delivery (AFTER UPDATE ON pedidos)

-- Só conclui a solicitação; a criação do pagamento ficou só em auto_create_pagamento_on_delivery.
CREATE OR REPLACE FUNCTION public.trg_pedido_entregue_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'entregue' AND OLD.status IS DISTINCT FROM 'entregue' THEN
    -- Update solicitação to concluída
    IF NEW.solicitacao_id IS NOT NULL THEN
      UPDATE solicitacoes
      SET status = 'concluida', data_conclusao = now(), updated_at = now()
      WHERE id = NEW.solicitacao_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------------------------
-- (c) Um único gatilho de orçamento em solicitacoes: linha anual + linha do mês da solicitação
-- ---------------------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_solicitacao_budget_sync ON public.solicitacoes;
DROP FUNCTION IF EXISTS public.handle_solicitacao_budget_change();
-- mantido: trg_update_budget_on_solicitacao

CREATE OR REPLACE FUNCTION public.update_budget_on_solicitacao_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_old_status TEXT := NULL;
    v_new_status TEXT := NEW.status;
    v_cost_center_id UUID := NEW.cost_center_id;
    v_old_cost_center_id UUID := NULL;
BEGIN
    -- Período = data da solicitação: linha anual (mes IS NULL) + linha do mês (se existir).
    -- Antes o filtro era só "ano", que acertava a anual e TODAS as mensais.

    -- Se for DELETE, precisamos remover o valor comprometido
    IF (TG_OP = 'DELETE') THEN
        IF (OLD.status != 'cancelada' AND OLD.status != 'finalizada' AND OLD.cost_center_id IS NOT NULL) THEN
            UPDATE public.department_budgets
            SET valor_comprometido = valor_comprometido - COALESCE(OLD.valor_estimado, 0)
            WHERE cost_center_id = OLD.cost_center_id
            AND ano = EXTRACT(YEAR FROM OLD.created_at)
            AND (mes IS NULL OR mes = EXTRACT(MONTH FROM OLD.created_at));
        END IF;
        RETURN OLD;
    END IF;

    -- Se for INSERT
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.status != 'cancelada' AND NEW.status != 'finalizada' AND v_cost_center_id IS NOT NULL) THEN
            UPDATE public.department_budgets
            SET valor_comprometido = valor_comprometido + COALESCE(NEW.valor_estimado, 0)
            WHERE cost_center_id = v_cost_center_id
            AND ano = EXTRACT(YEAR FROM NEW.created_at)
            AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        END IF;
    END IF;

    -- Se for UPDATE
    IF (TG_OP = 'UPDATE') THEN
        v_old_status := OLD.status;
        v_old_cost_center_id := OLD.cost_center_id;

        -- Caso 1: Mudança de Centro de Custo
        IF (v_old_cost_center_id IS DISTINCT FROM v_cost_center_id) THEN
            -- Remove do antigo
            IF (v_old_status != 'cancelada' AND v_old_status != 'finalizada' AND v_old_cost_center_id IS NOT NULL) THEN
                UPDATE public.department_budgets
                SET valor_comprometido = valor_comprometido - COALESCE(OLD.valor_estimado, 0)
                WHERE cost_center_id = v_old_cost_center_id
                AND ano = EXTRACT(YEAR FROM OLD.created_at)
                AND (mes IS NULL OR mes = EXTRACT(MONTH FROM OLD.created_at));
            END IF;
            -- Adiciona no novo
            IF (v_new_status != 'cancelada' AND v_new_status != 'finalizada' AND v_cost_center_id IS NOT NULL) THEN
                UPDATE public.department_budgets
                SET valor_comprometido = valor_comprometido + COALESCE(NEW.valor_estimado, 0)
                WHERE cost_center_id = v_cost_center_id
                AND ano = EXTRACT(YEAR FROM NEW.created_at)
                AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
            END IF;

        -- Caso 2: Mesma CC, mudou valor ou status
        ELSE
            IF (v_cost_center_id IS NOT NULL) THEN
                -- Mudou de Ativo para Finalizado (Converte Comprometido em Utilizado)
                IF (v_old_status != 'finalizada' AND v_new_status = 'finalizada') THEN
                    UPDATE public.department_budgets
                    SET valor_comprometido = valor_comprometido - COALESCE(OLD.valor_estimado, 0),
                        valor_utilizado = valor_utilizado + COALESCE(NEW.valor_estimado, 0)
                    WHERE cost_center_id = v_cost_center_id
                    AND ano = EXTRACT(YEAR FROM NEW.created_at)
                    AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));

                -- Mudou de Ativo para Cancelado (Remove Comprometido)
                ELSIF (v_old_status != 'cancelada' AND v_new_status = 'cancelada') THEN
                    UPDATE public.department_budgets
                    SET valor_comprometido = valor_comprometido - COALESCE(OLD.valor_estimado, 0)
                    WHERE cost_center_id = v_cost_center_id
                    AND ano = EXTRACT(YEAR FROM NEW.created_at)
                    AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));

                -- Mudou Valor (Apenas se ainda estiver ativo)
                ELSIF (v_new_status != 'cancelada' AND v_new_status != 'finalizada' AND OLD.valor_estimado IS DISTINCT FROM NEW.valor_estimado) THEN
                    UPDATE public.department_budgets
                    SET valor_comprometido = valor_comprometido - COALESCE(OLD.valor_estimado, 0) + COALESCE(NEW.valor_estimado, 0)
                    WHERE cost_center_id = v_cost_center_id
                    AND ano = EXTRACT(YEAR FROM NEW.created_at)
                    AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- Era SECURITY INVOKER: sob a RLS de department_budgets, um usuário sem política de escrita
-- comprometia 0 linhas em silêncio. Função de gatilho não precisa de EXECUTE para clientes.
REVOKE EXECUTE ON FUNCTION public.update_budget_on_solicitacao_change() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- (d) Um único gatilho de auditoria em pagamentos
-- ---------------------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_pagamentos_trigger ON public.pagamentos;
-- mantido: trg_audit_pagamentos
