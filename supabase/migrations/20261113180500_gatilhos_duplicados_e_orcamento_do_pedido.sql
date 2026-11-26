-- fix(banco): gatilhos duplicados deixam de rodar 2x e aprovação de pedido mexe só no orçamento do período
--
-- (a) Gatilhos duplicados (mesma função, mesma tabela, mesmos eventos, sem WHEN) — cada par vinha de
--     duas migrations antigas que criaram o mesmo gatilho com nomes diferentes. Remove só a cópia;
--     fica o nome do padrão da tabela/família:
--       pedidos      trigger_update_saldo_on_pedido  AFTER INSERT OR UPDATE OR DELETE
--                    fica trg_update_saldo_on_pedido (par de trg_update_saldo_on_pagamento)
--                    sai  update_saldo_on_pedido_change (recalculava o saldo do fornecedor 2x por mudança)
--       pedidos      update_updated_at_column        BEFORE UPDATE
--                    fica trg_update_pedidos_updated_at · sai update_pedidos_updated_at
--       solicitacoes update_updated_at_column        BEFORE UPDATE
--                    fica trg_update_solicitacoes_updated_at · sai update_solicitacoes_updated_at
--       tenants      update_updated_at_column        BEFORE UPDATE
--                    fica update_tenants_updated_at (padrão update_<tabela>_updated_at) · sai tr_tenants_updated_at
--     NÃO removidos (eventos diferentes; a função é pura/recalcula, rodar 2x não soma em dobro):
--       pedidos      validate_pedido_status_transition       trg_validate_pedido_status (BEFORE UPDATE)
--                                                            x validate_pedido_status (BEFORE UPDATE OF status)
--       solicitacoes validate_solicitacao_status_transition  trg_validate_solicitacao_status (BEFORE UPDATE)
--                                                            x validate_solicitacao_status (BEFORE UPDATE OF status)
--       supplier_documents trigger_recalculate_qualification_score
--                    recalculate_qualification_on_document_change (INSERT OR UPDATE OR DELETE)
--                    x trg_recalculate_qualification_score (INSERT OR UPDATE)
--
-- (b) handle_pedido_budget_realization (gatilho trg_pedido_budget_sync em pedidos) filtrava
--     department_budgets só por "ano = ano corrente": ao aprovar/cancelar um pedido, mexia na linha
--     anual E em todas as mensais do centro de custo (comprometido/utilizado multiplicados pelo nº de
--     linhas). Passa a usar o mesmo período que update_budget_on_solicitacao_change
--     (20261113122251): ano da solicitação e (mes IS NULL OR mes = mês da solicitação).
--
-- Idempotente: DROP TRIGGER IF EXISTS / CREATE OR REPLACE.

-- ---------------------------------------------------------------------------------------------
-- (a) Cópias redundantes
-- ---------------------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_saldo_on_pedido_change ON public.pedidos;
DROP TRIGGER IF EXISTS update_pedidos_updated_at ON public.pedidos;
DROP TRIGGER IF EXISTS update_solicitacoes_updated_at ON public.solicitacoes;
DROP TRIGGER IF EXISTS tr_tenants_updated_at ON public.tenants;

-- ---------------------------------------------------------------------------------------------
-- (b) Orçamento do pedido: linha anual + linha do mês da solicitação
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_pedido_budget_realization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_solicitacao_id UUID;
    v_cost_center_id UUID;
    v_valor_solicitado NUMERIC;
    v_sol_created_at TIMESTAMPTZ;
BEGIN
    -- Obter a solicitação vinculada para saber o centro de custo e o período do orçamento
    SELECT id, cost_center_id, valor_estimado, created_at
    INTO v_solicitacao_id, v_cost_center_id, v_valor_solicitado, v_sol_created_at
    FROM public.solicitacoes
    WHERE id = NEW.solicitacao_id;

    IF v_cost_center_id IS NOT NULL THEN
        -- Se o pedido foi aprovado ou concluído
        IF (NEW.status IN ('aprovado', 'concluido', 'recebido') AND (OLD.status IS NULL OR OLD.status NOT IN ('aprovado', 'concluido', 'recebido'))) THEN
            UPDATE public.department_budgets
            SET valor_comprometido = valor_comprometido - COALESCE(v_valor_solicitado, 0),
                valor_utilizado = valor_utilizado + COALESCE(NEW.valor_total, 0)
            WHERE cost_center_id = v_cost_center_id
            AND ano = EXTRACT(YEAR FROM v_sol_created_at)
            AND (mes IS NULL OR mes = EXTRACT(MONTH FROM v_sol_created_at));

        -- Se o pedido foi cancelado e já tinha impactado o orçamento como utilizado
        ELSIF (NEW.status = 'cancelado' AND OLD.status IN ('aprovado', 'concluido', 'recebido')) THEN
            UPDATE public.department_budgets
            SET valor_utilizado = valor_utilizado - COALESCE(OLD.valor_total, 0),
                valor_comprometido = valor_comprometido + COALESCE(v_valor_solicitado, 0)
            WHERE cost_center_id = v_cost_center_id
            AND ano = EXTRACT(YEAR FROM v_sol_created_at)
            AND (mes IS NULL OR mes = EXTRACT(MONTH FROM v_sol_created_at));
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;
