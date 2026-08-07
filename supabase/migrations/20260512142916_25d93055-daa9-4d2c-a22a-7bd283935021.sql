-- Função para atualizar o orçamento quando uma solicitação é criada ou atualizada
CREATE OR REPLACE FUNCTION public.handle_solicitacao_budget_change()
RETURNS TRIGGER AS $$
DECLARE
    v_diff NUMERIC := 0;
BEGIN
    -- Se mudou o centro de custo, precisamos estornar do antigo e adicionar no novo
    IF (TG_OP = 'UPDATE' AND OLD.cost_center_id IS DISTINCT FROM NEW.cost_center_id) THEN
        -- Estorna do antigo
        IF OLD.cost_center_id IS NOT NULL THEN
            UPDATE public.department_budgets
            SET valor_comprometido = valor_comprometido - COALESCE(OLD.valor_estimado, 0)
            WHERE cost_center_id = OLD.cost_center_id
            AND ano = EXTRACT(YEAR FROM CURRENT_DATE);
        END IF;
        
        -- Adiciona no novo
        IF NEW.cost_center_id IS NOT NULL THEN
            UPDATE public.department_budgets
            SET valor_comprometido = valor_comprometido + COALESCE(NEW.valor_estimado, 0)
            WHERE cost_center_id = NEW.cost_center_id
            AND ano = EXTRACT(YEAR FROM CURRENT_DATE);
        END IF;
    
    -- Se apenas mudou o valor estimado no mesmo centro de custo
    ELSIF (TG_OP = 'UPDATE' AND NEW.cost_center_id IS NOT NULL) THEN
        v_diff := COALESCE(NEW.valor_estimado, 0) - COALESCE(OLD.valor_estimado, 0);
        UPDATE public.department_budgets
        SET valor_comprometido = valor_comprometido + v_diff
        WHERE cost_center_id = NEW.cost_center_id
        AND ano = EXTRACT(YEAR FROM CURRENT_DATE);

    -- Se é uma nova inserção
    ELSIF (TG_OP = 'INSERT' AND NEW.cost_center_id IS NOT NULL) THEN
        UPDATE public.department_budgets
        SET valor_comprometido = valor_comprometido + COALESCE(NEW.valor_estimado, 0)
        WHERE cost_center_id = NEW.cost_center_id
        AND ano = EXTRACT(YEAR FROM CURRENT_DATE);
        
    -- Se é um delete
    ELSIF (TG_OP = 'DELETE' AND OLD.cost_center_id IS NOT NULL) THEN
        UPDATE public.department_budgets
        SET valor_comprometido = valor_comprometido - COALESCE(OLD.valor_estimado, 0)
        WHERE cost_center_id = OLD.cost_center_id
        AND ano = EXTRACT(YEAR FROM CURRENT_DATE);
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para solicitações
DROP TRIGGER IF EXISTS trg_solicitacao_budget_sync ON public.solicitacoes;
CREATE TRIGGER trg_solicitacao_budget_sync
AFTER INSERT OR UPDATE OR DELETE ON public.solicitacoes
FOR EACH ROW EXECUTE FUNCTION public.handle_solicitacao_budget_change();

-- Função para converter solicitação em pedido (ajuste de comprometido para utilizado)
CREATE OR REPLACE FUNCTION public.handle_pedido_budget_realization()
RETURNS TRIGGER AS $$
DECLARE
    v_solicitacao_id UUID;
    v_cost_center_id UUID;
    v_valor_solicitado NUMERIC;
BEGIN
    -- Obter a solicitação vinculada para saber o centro de custo
    SELECT id, cost_center_id, valor_estimado 
    INTO v_solicitacao_id, v_cost_center_id, v_valor_solicitado
    FROM public.solicitacoes 
    WHERE id = NEW.solicitacao_id;

    IF v_cost_center_id IS NOT NULL THEN
        -- Se o pedido foi aprovado ou concluído
        IF (NEW.status IN ('aprovado', 'concluido', 'recebido') AND (OLD.status IS NULL OR OLD.status NOT IN ('aprovado', 'concluido', 'recebido'))) THEN
            UPDATE public.department_budgets
            SET valor_comprometido = valor_comprometido - COALESCE(v_valor_solicitado, 0),
                valor_utilizado = valor_utilizado + COALESCE(NEW.valor_total, 0)
            WHERE cost_center_id = v_cost_center_id
            AND ano = EXTRACT(YEAR FROM CURRENT_DATE);
            
        -- Se o pedido foi cancelado e já tinha impactado o orçamento como utilizado
        ELSIF (NEW.status = 'cancelado' AND OLD.status IN ('aprovado', 'concluido', 'recebido')) THEN
            UPDATE public.department_budgets
            SET valor_utilizado = valor_utilizado - COALESCE(OLD.valor_total, 0),
                valor_comprometido = valor_comprometido + COALESCE(v_valor_solicitado, 0)
            WHERE cost_center_id = v_cost_center_id
            AND ano = EXTRACT(YEAR FROM CURRENT_DATE);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para pedidos
DROP TRIGGER IF EXISTS trg_pedido_budget_sync ON public.pedidos;
CREATE TRIGGER trg_pedido_budget_sync
AFTER INSERT OR UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.handle_pedido_budget_realization();
