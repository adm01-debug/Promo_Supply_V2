-- Adicionar coluna de justificativa se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cotacoes' AND column_name = 'justificativa_selecao') THEN
        ALTER TABLE public.cotacoes ADD COLUMN justificativa_selecao TEXT;
    END IF;
END $$;

-- Função para calcular scores de cotações
CREATE OR REPLACE FUNCTION public.calculate_cotacao_scores()
RETURNS TRIGGER AS $$
DECLARE
    v_min_total NUMERIC;
    v_max_total NUMERIC;
    v_min_prazo INT;
    v_max_prazo INT;
    v_weights_preco NUMERIC := 0.6; -- 60% peso preço
    v_weights_prazo NUMERIC := 0.2; -- 20% peso prazo
    v_weights_qualidade NUMERIC := 0.2; -- 20% peso qualidade (fixo por enquanto)
BEGIN
    -- Pegar limites para normalização da mesma solicitação
    SELECT MIN(valor_total), MAX(valor_total), MIN(prazo_entrega), MAX(prazo_entrega)
    INTO v_min_total, v_max_total, v_min_prazo, v_max_prazo
    FROM public.cotacoes
    WHERE solicitacao_id = NEW.solicitacao_id;

    -- Prevenir divisão por zero
    IF v_max_total = v_min_total THEN v_max_total := v_min_total + 1; END IF;
    IF v_max_prazo = v_min_prazo THEN v_max_prazo := v_min_prazo + 1; END IF;

    -- Cálculo Score Preço (Inverso: menor preço = 100)
    NEW.score_preco := (1 - (NEW.valor_total - v_min_total) / (v_max_total - v_min_total)) * 100;
    
    -- Cálculo Score Prazo (Inverso: menor prazo = 100)
    NEW.score_prazo := (1 - (NEW.prazo_entrega - v_min_prazo) / (v_max_prazo - v_min_prazo)) * 100;

    -- Score Qualidade (Fallback para 80 se nulo)
    IF NEW.score_qualidade IS NULL THEN
        NEW.score_qualidade := 80;
    END IF;

    -- Score Total Composto
    NEW.score_total := (NEW.score_preco * v_weights_preco) + 
                       (NEW.score_prazo * v_weights_prazo) + 
                       (NEW.score_qualidade * v_weights_qualidade);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualização automática de scores
DROP TRIGGER IF EXISTS tr_update_cotacao_scores ON public.cotacoes;
CREATE TRIGGER tr_update_cotacao_scores
BEFORE INSERT OR UPDATE OF valor_total, prazo_entrega, score_qualidade
ON public.cotacoes
FOR EACH ROW
EXECUTE FUNCTION public.calculate_cotacao_scores();

-- Trigger de Auditoria para Cotações
CREATE OR REPLACE FUNCTION public.log_cotacao_action()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_name TEXT;
    v_user_email TEXT;
BEGIN
    SELECT display_name, email INTO v_user_name, v_user_email FROM public.profiles WHERE id = v_user_id;

    IF (TG_OP = 'UPDATE' AND OLD.selecionada IS DISTINCT FROM NEW.selecionada AND NEW.selecionada = true) THEN
        INSERT INTO public.audit_logs (
            user_id, user_name, user_email, action_type, entity_type, entity_id, entity_description, new_values, metadata
        ) VALUES (
            v_user_id, v_user_name, v_user_email, 'update', 'cotacao', NEW.id, 
            'Fornecedor selecionado para a solicitação ' || NEW.solicitacao_id,
            jsonb_build_object('selecionada', true, 'justificativa', NEW.justificativa_selecao),
            jsonb_build_object('solicitacao_id', NEW.solicitacao_id, 'fornecedor_id', NEW.fornecedor_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_log_cotacao_selection ON public.cotacoes;
CREATE TRIGGER tr_log_cotacao_selection
AFTER UPDATE OF selecionada ON public.cotacoes
FOR EACH ROW
EXECUTE FUNCTION public.log_cotacao_action();
