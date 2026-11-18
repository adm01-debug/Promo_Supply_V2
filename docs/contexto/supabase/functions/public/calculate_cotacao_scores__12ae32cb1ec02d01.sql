CREATE OR REPLACE FUNCTION public.calculate_cotacao_scores()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_min_total NUMERIC;
    v_max_total NUMERIC;
    v_min_prazo NUMERIC;
    v_max_prazo NUMERIC;
    v_weights_preco NUMERIC := 0.6; -- 60% peso preço
    v_weights_prazo NUMERIC := 0.2; -- 20% peso prazo
    v_weights_qualidade NUMERIC := 0.2; -- 20% peso qualidade (fixo por enquanto)
BEGIN
    -- Limites da mesma solicitação, incluindo a própria NEW (e não a versão antiga dela)
    SELECT MIN(x.valor_total), MAX(x.valor_total), MIN(x.prazo_entrega), MAX(x.prazo_entrega)
    INTO v_min_total, v_max_total, v_min_prazo, v_max_prazo
    FROM (
        SELECT c.valor_total, c.prazo_entrega::numeric AS prazo_entrega
        FROM public.cotacoes c
        WHERE c.solicitacao_id = NEW.solicitacao_id
          AND c.id IS DISTINCT FROM NEW.id
        UNION ALL
        SELECT NEW.valor_total, NEW.prazo_entrega::numeric
    ) x;

    -- Menor preço = 100; todos iguais = 100
    NEW.score_preco := CASE
        WHEN NEW.valor_total IS NULL THEN NULL
        WHEN v_max_total = v_min_total THEN 100
        ELSE ROUND((1 - (NEW.valor_total - v_min_total) / (v_max_total - v_min_total)) * 100, 2)
    END;

    -- Menor prazo = 100; todos iguais = 100
    NEW.score_prazo := CASE
        WHEN NEW.prazo_entrega IS NULL THEN NULL
        WHEN v_max_prazo = v_min_prazo THEN 100
        ELSE ROUND((1 - (NEW.prazo_entrega - v_min_prazo) / (v_max_prazo - v_min_prazo)) * 100, 2)
    END;

    -- Score Qualidade (Fallback para 80 se nulo)
    IF NEW.score_qualidade IS NULL THEN
        NEW.score_qualidade := 80;
    END IF;

    -- Score Total Composto
    NEW.score_total := ROUND((NEW.score_preco * v_weights_preco) +
                             (NEW.score_prazo * v_weights_prazo) +
                             (NEW.score_qualidade * v_weights_qualidade), 2);

    RETURN NEW;
END;
$function$
