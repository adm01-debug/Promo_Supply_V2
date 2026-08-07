-- Função para atualizar o orçamento baseado no status da solicitação
CREATE OR REPLACE FUNCTION public.handle_solicitacao_budget_change()
RETURNS TRIGGER AS $$
DECLARE
    v_valor_old NUMERIC;
    v_valor_new NUMERIC;
    v_cc_id_old UUID;
    v_cc_id_new UUID;
BEGIN
    v_valor_old := COALESCE(OLD.valor_estimado, 0);
    v_valor_new := COALESCE(NEW.valor_estimado, 0);
    v_cc_id_old := OLD.cost_center_id;
    v_cc_id_new := NEW.cost_center_id;

    -- Se o status mudou para 'aprovada', comprometer o valor
    IF (NEW.status = 'aprovada' AND (OLD.status IS NULL OR OLD.status != 'aprovada')) THEN
        UPDATE public.department_budgets 
        SET valor_comprometido = valor_comprometido + v_valor_new
        WHERE cost_center_id = v_cc_id_new AND ano = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Se o status mudou de 'aprovada' para algo que não seja 'concluida' (cancelado/rejeitado), estornar o comprometido
    ELSIF (OLD.status = 'aprovada' AND NEW.status IN ('rejeitada', 'cancelada')) THEN
        UPDATE public.department_budgets 
        SET valor_comprometido = GREATEST(0, valor_comprometido - v_valor_old)
        WHERE cost_center_id = v_cc_id_old AND ano = EXTRACT(YEAR FROM CURRENT_DATE);

    -- Se o status mudou para 'concluida', mover de comprometido para utilizado
    ELSIF (NEW.status = 'concluida' AND OLD.status = 'aprovada') THEN
        UPDATE public.department_budgets 
        SET valor_comprometido = GREATEST(0, valor_comprometido - v_valor_old),
            valor_utilizado = valor_utilizado + COALESCE(NEW.valor_aprovado, v_valor_new)
        WHERE cost_center_id = v_cc_id_new AND ano = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Se o valor estimado mudou enquanto estava aprovada, ajustar o comprometido
    ELSIF (NEW.status = 'aprovada' AND OLD.status = 'aprovada' AND v_valor_old != v_valor_new) THEN
        UPDATE public.department_budgets 
        SET valor_comprometido = valor_comprometido - v_valor_old + v_valor_new
        WHERE cost_center_id = v_cc_id_new AND ano = EXTRACT(YEAR FROM CURRENT_DATE);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger
DROP TRIGGER IF EXISTS trg_solicitacao_budget_sync ON public.solicitacoes;
CREATE TRIGGER trg_solicitacao_budget_sync
AFTER UPDATE ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.handle_solicitacao_budget_change();
