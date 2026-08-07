-- Ajuste de search_path na função calculate_cotacao_scores
CREATE OR REPLACE FUNCTION public.calculate_cotacao_scores()
RETURNS TRIGGER AS $$
DECLARE
    min_valor NUMERIC;
    max_valor NUMERIC;
    min_prazo INTEGER;
    max_prazo INTEGER;
    v_score_preco NUMERIC;
    v_score_prazo NUMERIC;
    v_score_qualidade NUMERIC;
BEGIN
    -- Se não houver solicitação vinculada, não calcula scores relativos
    IF NEW.solicitacao_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Busca min/max da mesma solicitação para normalização
    SELECT 
        MIN(valor_total), MAX(valor_total),
        MIN(prazo_entrega), MAX(prazo_entrega)
    INTO 
        min_valor, max_valor,
        min_prazo, max_prazo
    FROM public.cotacoes
    WHERE solicitacao_id = NEW.solicitacao_id AND id != NEW.id;

    -- Se for a primeira cotação, define scores base (100)
    IF min_valor IS NULL THEN
        NEW.score_preco := 100;
        NEW.score_prazo := 100;
        NEW.score_total := 100;
        RETURN NEW;
    END IF;

    -- Atualiza min/max considerando o novo registro
    min_valor := LEAST(min_valor, NEW.valor_total);
    max_valor := GREATEST(max_valor, NEW.valor_total);
    min_prazo := LEAST(min_prazo, NEW.prazo_entrega);
    max_prazo := GREATEST(max_prazo, NEW.prazo_entrega);

    -- Cálculo Score Preço (Inversamente proporcional)
    IF max_valor = min_valor THEN
        v_score_preco := 100;
    ELSE
        v_score_preco := 100 * (1 - (NEW.valor_total - min_valor) / (max_valor));
    END IF;

    -- Cálculo Score Prazo (Inversamente proporcional)
    IF max_prazo = min_prazo THEN
        v_score_prazo := 100;
    ELSE
        v_score_prazo := 100 * (1 - (CAST(NEW.prazo_entrega AS NUMERIC) - min_prazo) / (max_prazo));
    END IF;

    -- Score de Qualidade
    SELECT COALESCE(avaliacao * 20, 80) INTO v_score_qualidade
    FROM public.fornecedores
    WHERE id = NEW.fornecedor_id;

    -- Atualiza os campos do registro
    NEW.score_preco := GREATEST(0, LEAST(100, v_score_preco));
    NEW.score_prazo := GREATEST(0, LEAST(100, v_score_prazo));
    NEW.score_qualidade := v_score_qualidade;
    NEW.score_total := (NEW.score_preco * 0.5) + (NEW.score_prazo * 0.3) + (NEW.score_qualidade * 0.2);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ajuste de search_path na função recalculate_all_solicitacao_cotacoes
CREATE OR REPLACE FUNCTION public.recalculate_all_solicitacao_cotacoes()
RETURNS TRIGGER AS $$
BEGIN
    -- Evita recursão infinita
    IF pg_trigger_depth() > 1 THEN
        RETURN NULL;
    END IF;

    UPDATE public.cotacoes
    SET updated_at = now()
    WHERE solicitacao_id = COALESCE(NEW.solicitacao_id, OLD.solicitacao_id)
    AND id != COALESCE(NEW.id, OLD.id);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
