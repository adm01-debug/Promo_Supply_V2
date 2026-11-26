-- ============================================
-- MIGRATION: compra completa volta a funcionar (notas de cotação e sequência de status)
-- Data: 2026-11-13
--
-- (a) calculate_cotacao_scores (trigger trg_calculate_cotacao_scores, BEFORE INSERT/UPDATE em cotacoes)
--     calculava min/max só com as linhas já gravadas, sem a própria NEW. Com 1 cotação existente
--     forçava max = min + 1, e a 2ª cotação com total diferente gerava nota de preço de milhares
--     → numeric(5,2) estourava (22003 "numeric field overflow") e a cotação não era gravada.
--     A nota de prazo usava divisão inteira (só 0 ou 100). Agora min/max incluem NEW (e excluem a
--     versão antiga da própria linha), min = max dá 100, e as notas ficam sempre em 0..100.
--
-- (b) Sequência da solicitação: pendente → em_cotacao → aprovada → em_andamento → concluida
--     (matriz de validate_solicitacao_status_transition, igual ao front, não muda).
--     - trg_solicitacao_approved_transition reescrevia 'aprovada' → 'cotacao' (status que não existe
--       no CHECK): nenhuma solicitação conseguia ser aprovada. Trigger e função removidos.
--     - aprovar/selecionar a cotação vencedora tentava levar a solicitação direto a em_andamento a
--       partir de pendente/em_cotacao (transição inválida → erro). Agora leva a 'aprovada', só a
--       partir de pendente/em_cotacao; em qualquer outro status não mexe.
--     - gerar pedido (INSERT em pedidos) leva a solicitação de 'aprovada' a 'em_andamento'.
--     - pedido entregue leva a solicitação a 'concluida' só a partir de 'em_andamento'
--       (antes trg_pedido_entregue_transition gravava 'concluida' sem checar o status e
--       auto_transition_solicitacao_on_pedido_delivery tentava 'aprovada' → 'concluida').
--       auto_transition_solicitacao_on_pedido_delivery era duplicata: removida.
--     - trg_pedido_entregue_transition também criava um 2º pagamento para o mesmo pedido
--       (auto_create_pagamento_on_delivery já cria um, com checagem de existência). Removido daqui.
--
-- Idempotente: CREATE OR REPLACE / DROP ... IF EXISTS / DROP TRIGGER IF EXISTS antes de CREATE.
-- ============================================

-- (a) notas da cotação sempre em 0..100 -------------------------------------------------------
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
$function$;

-- (b1) 'aprovada' não é mais reescrita para 'cotacao' ------------------------------------------
DROP TRIGGER IF EXISTS trg_solicitacao_approved_auto ON public.solicitacoes;
DROP FUNCTION IF EXISTS public.trg_solicitacao_approved_transition();

-- (b2) cotação aprovada → solicitação 'aprovada' (só a partir de pendente/em_cotacao) ----------
CREATE OR REPLACE FUNCTION public.auto_transition_solicitacao_on_cotacao_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'aprovada' AND OLD.status IS DISTINCT FROM 'aprovada' AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes
    SET status = 'aprovada', updated_at = now()
    WHERE id = NEW.solicitacao_id
    AND status IN ('pendente', 'em_cotacao');
  END IF;
  RETURN NEW;
END;
$function$;

-- (b3) cotação selecionada → solicitação 'aprovada' (só a partir de pendente/em_cotacao) -------
CREATE OR REPLACE FUNCTION public.trg_cotacao_approved_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.selecionada = true AND (OLD.selecionada IS DISTINCT FROM NEW.selecionada) AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes
    SET status = 'aprovada', updated_at = now()
    WHERE id = NEW.solicitacao_id
    AND status IN ('pendente', 'em_cotacao');
  END IF;
  RETURN NEW;
END;
$function$;

-- (b4) pedido gerado → solicitação 'em_andamento' (só a partir de 'aprovada') -----------------
CREATE OR REPLACE FUNCTION public.auto_transition_solicitacao_on_pedido_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes
    SET status = 'em_andamento', updated_at = now()
    WHERE id = NEW.solicitacao_id
    AND status = 'aprovada';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.auto_transition_solicitacao_on_pedido_created() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_transition_solicitacao_on_pedido_created() TO service_role;

DROP TRIGGER IF EXISTS trg_pedido_created_status ON public.pedidos;
CREATE TRIGGER trg_pedido_created_status
  AFTER INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.auto_transition_solicitacao_on_pedido_created();

-- (b5) pedido entregue → solicitação 'concluida' (só a partir de 'em_andamento') --------------
CREATE OR REPLACE FUNCTION public.trg_pedido_entregue_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- O pagamento do pedido entregue é criado por auto_create_pagamento_on_delivery.
  IF NEW.status = 'entregue' AND OLD.status IS DISTINCT FROM 'entregue' AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes
    SET status = 'concluida', data_conclusao = COALESCE(data_conclusao, now()), updated_at = now()
    WHERE id = NEW.solicitacao_id
    AND status = 'em_andamento';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_transition_on_pedido_delivery ON public.pedidos;
DROP FUNCTION IF EXISTS public.auto_transition_solicitacao_on_pedido_delivery();
