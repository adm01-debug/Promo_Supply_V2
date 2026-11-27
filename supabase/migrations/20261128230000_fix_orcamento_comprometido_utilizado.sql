-- Etapas 092 e 138 (NEG-09): o orcamento por centro de custo nunca liberava o valor
-- comprometido e lancava o valor utilizado duas vezes.
--
-- Defeitos confirmados no corpo vigente das funcoes (lido de producao no run
-- 45891758943, pg_get_functiondef):
--   * update_budget_on_solicitacao_change testava 'finalizada' (estado inexistente no
--     CHECK de solicitacoes.status: pendente|em_cotacao|aprovada|rejeitada|em_andamento|
--     concluida|cancelada), nunca liberava o comprometido de 'rejeitada' e permitia
--     valor_comprometido negativo;
--   * handle_pedido_budget_realization testava 'concluido' e 'recebido', inexistentes no
--     CHECK de pedidos.status (pendente|aprovado|enviado|em_transito|entregue|parcial|
--     cancelado) - cancelar um pedido ja enviado/entregue nunca devolvia orcamento - e
--     ignorava mudanca de valor_total de um pedido que ja estava em gasto;
--   * sync_budget_on_payment somava valor_utilizado = valor_utilizado + NEW.valor no
--     'pago' de um pagamento de pedido, contando o mesmo gasto que o pedido aprovado ja
--     tinha lancado.
--
-- Regra adotada (uma fonte por contador, sem dupla contagem):
--   comprometido = solicitacoes que ainda retem orcamento (nenhum pedido em gasto);
--   utilizado    = pedidos em estado de gasto (aprovado, enviado, em_transito, entregue,
--                  parcial) e pagamentos avulsos (sem pedido vinculado).
--
-- Vocabulario real do banco usado aqui (nao inventar estado novo): os unicos estados
-- terminais negativos de solicitacao sao 'cancelada' e 'rejeitada'.
--
-- Reversao: supabase/rollbacks/20261128230000_revert_fix_orcamento_comprometido_utilizado.sql

BEGIN;

-- 1) Fonte unica da verdade sobre "esta solicitacao ainda segura orcamento?"
--    Deixa de segurar quando: o status encerra sem compra (cancelada/rejeitada) ou
--    quando algum pedido vinculado ja virou gasto (quem assumiu o valor foi o pedido).
CREATE OR REPLACE FUNCTION public.solicitacao_retem_orcamento(p_solicitacao_id uuid, p_status text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_status IS NULL THEN false
    WHEN p_status IN ('cancelada', 'rejeitada') THEN false
    WHEN EXISTS (
      SELECT 1
        FROM public.pedidos p
       WHERE p.solicitacao_id = p_solicitacao_id
         AND p.status IN ('aprovado', 'enviado', 'em_transito', 'entregue', 'parcial')
    ) THEN false
    ELSE true
  END
$$;

COMMENT ON FUNCTION public.solicitacao_retem_orcamento(uuid, text) IS
  'True quando a solicitacao ainda ocupa department_budgets.valor_comprometido (etapas 092/138).';

-- 2) Gatilho da solicitacao: mantem apenas o comprometido.
CREATE OR REPLACE FUNCTION public.update_budget_on_solicitacao_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_old_retem BOOLEAN := false;
    v_new_retem BOOLEAN := false;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        IF public.solicitacao_retem_orcamento(OLD.id, OLD.status) AND OLD.cost_center_id IS NOT NULL THEN
            UPDATE public.department_budgets
               SET valor_comprometido = GREATEST(0, valor_comprometido - COALESCE(OLD.valor_estimado, 0)),
                   updated_at = now()
             WHERE cost_center_id = OLD.cost_center_id
               AND ano = EXTRACT(YEAR FROM OLD.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM OLD.created_at));
        END IF;
        RETURN OLD;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        IF public.solicitacao_retem_orcamento(NEW.id, NEW.status) AND NEW.cost_center_id IS NOT NULL THEN
            UPDATE public.department_budgets
               SET valor_comprometido = valor_comprometido + COALESCE(NEW.valor_estimado, 0),
                   updated_at = now()
             WHERE cost_center_id = NEW.cost_center_id
               AND ano = EXTRACT(YEAR FROM NEW.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        END IF;
        RETURN NEW;
    END IF;

    -- UPDATE
    v_old_retem := public.solicitacao_retem_orcamento(OLD.id, OLD.status);
    v_new_retem := public.solicitacao_retem_orcamento(NEW.id, NEW.status);

    IF (OLD.cost_center_id IS DISTINCT FROM NEW.cost_center_id) THEN
        -- Mudou de centro de custo: devolve no antigo e retira no novo.
        IF v_old_retem AND OLD.cost_center_id IS NOT NULL THEN
            UPDATE public.department_budgets
               SET valor_comprometido = GREATEST(0, valor_comprometido - COALESCE(OLD.valor_estimado, 0)),
                   updated_at = now()
             WHERE cost_center_id = OLD.cost_center_id
               AND ano = EXTRACT(YEAR FROM OLD.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM OLD.created_at));
        END IF;
        IF v_new_retem AND NEW.cost_center_id IS NOT NULL THEN
            UPDATE public.department_budgets
               SET valor_comprometido = valor_comprometido + COALESCE(NEW.valor_estimado, 0),
                   updated_at = now()
             WHERE cost_center_id = NEW.cost_center_id
               AND ano = EXTRACT(YEAR FROM NEW.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        END IF;
    ELSIF (NEW.cost_center_id IS NOT NULL) THEN
        IF v_old_retem AND NOT v_new_retem THEN
            -- Encerrou (concluida, rejeitada, cancelada) ou um pedido assumiu o valor.
            UPDATE public.department_budgets
               SET valor_comprometido = GREATEST(0, valor_comprometido - COALESCE(OLD.valor_estimado, 0)),
                   updated_at = now()
             WHERE cost_center_id = NEW.cost_center_id
               AND ano = EXTRACT(YEAR FROM NEW.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        ELSIF NOT v_old_retem AND v_new_retem THEN
            -- Reaberta (ex.: rejeitada -> pendente): volta a comprometer.
            UPDATE public.department_budgets
               SET valor_comprometido = valor_comprometido + COALESCE(NEW.valor_estimado, 0),
                   updated_at = now()
             WHERE cost_center_id = NEW.cost_center_id
               AND ano = EXTRACT(YEAR FROM NEW.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        ELSIF v_old_retem AND v_new_retem
              AND COALESCE(OLD.valor_estimado, 0) IS DISTINCT FROM COALESCE(NEW.valor_estimado, 0) THEN
            -- Ainda retem e o valor mudou: ajusta pelo delta.
            UPDATE public.department_budgets
               SET valor_comprometido = GREATEST(0,
                       valor_comprometido - COALESCE(OLD.valor_estimado, 0) + COALESCE(NEW.valor_estimado, 0)),
                   updated_at = now()
             WHERE cost_center_id = NEW.cost_center_id
               AND ano = EXTRACT(YEAR FROM NEW.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 3) Gatilho do pedido: mantem apenas o utilizado, sempre no periodo da SOLICITACAO.
CREATE OR REPLACE FUNCTION public.handle_pedido_budget_realization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_sol_id UUID;
    v_cost_center_id UUID;
    v_valor_solicitado NUMERIC;
    v_sol_created_at TIMESTAMPTZ;
    v_sol_status TEXT;
    v_old_gasto BOOLEAN := false;
    v_new_gasto BOOLEAN := false;
    v_devolve_comprometido NUMERIC := 0;
BEGIN
    SELECT s.id, s.cost_center_id, s.valor_estimado, s.created_at, s.status
      INTO v_sol_id, v_cost_center_id, v_valor_solicitado, v_sol_created_at, v_sol_status
      FROM public.solicitacoes s
     WHERE s.id = NEW.solicitacao_id;

    IF v_cost_center_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        v_old_gasto := COALESCE(OLD.status = ANY (ARRAY['aprovado', 'enviado', 'em_transito', 'entregue', 'parcial']), false);
    END IF;
    v_new_gasto := COALESCE(NEW.status = ANY (ARRAY['aprovado', 'enviado', 'em_transito', 'entregue', 'parcial']), false);

    -- Solicitacao encerrada sem compra: nao devolve comprometido (ela nao retem mais).
    IF v_sol_status IS NOT NULL AND v_sol_status NOT IN ('cancelada', 'rejeitada') THEN
        v_devolve_comprometido := COALESCE(v_valor_solicitado, 0);
    END IF;

    IF v_new_gasto AND NOT v_old_gasto THEN
        -- Entrou em gasto: o pedido assume o valor da solicitacao.
        UPDATE public.department_budgets
           SET valor_comprometido = GREATEST(0, valor_comprometido - COALESCE(v_valor_solicitado, 0)),
               valor_utilizado = valor_utilizado + COALESCE(NEW.valor_total, 0),
               updated_at = now()
         WHERE cost_center_id = v_cost_center_id
           AND ano = EXTRACT(YEAR FROM v_sol_created_at)
           AND (mes IS NULL OR mes = EXTRACT(MONTH FROM v_sol_created_at));

    ELSIF v_new_gasto AND v_old_gasto
          AND COALESCE(OLD.valor_total, 0) IS DISTINCT FROM COALESCE(NEW.valor_total, 0) THEN
        -- Continua em gasto e o valor do pedido mudou: ajusta so o utilizado pelo delta.
        UPDATE public.department_budgets
           SET valor_utilizado = GREATEST(0, valor_utilizado - COALESCE(OLD.valor_total, 0) + COALESCE(NEW.valor_total, 0)),
               updated_at = now()
         WHERE cost_center_id = v_cost_center_id
           AND ano = EXTRACT(YEAR FROM v_sol_created_at)
           AND (mes IS NULL OR mes = EXTRACT(MONTH FROM v_sol_created_at));

    ELSIF v_old_gasto AND NOT v_new_gasto THEN
        -- Saiu do gasto (cancelado ou devolvido para pendente): devolve o valor.
        UPDATE public.department_budgets
           SET valor_utilizado = GREATEST(0, valor_utilizado - COALESCE(OLD.valor_total, 0)),
               valor_comprometido = valor_comprometido + v_devolve_comprometido,
               updated_at = now()
         WHERE cost_center_id = v_cost_center_id
           AND ano = EXTRACT(YEAR FROM v_sol_created_at)
           AND (mes IS NULL OR mes = EXTRACT(MONTH FROM v_sol_created_at));
    END IF;

    RETURN NEW;
END;
$$;

-- 4) Gatilho do pagamento: o gasto de um pedido ja foi lancado por ele. O pagamento so
--    lanca orcamento quando NAO tem pedido vinculado (pagamento avulso).
CREATE OR REPLACE FUNCTION public.sync_budget_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.cost_center_id IS NULL OR NEW.pedido_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status <> 'pago') THEN
        UPDATE public.department_budgets
           SET valor_utilizado = valor_utilizado + COALESCE(NEW.valor, 0),
               updated_at = now()
         WHERE cost_center_id = NEW.cost_center_id
           AND ano = EXTRACT(YEAR FROM NEW.created_at)
           AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));

    ELSIF OLD.status = 'pago' AND NEW.status <> 'pago' THEN
        UPDATE public.department_budgets
           SET valor_utilizado = GREATEST(0, valor_utilizado - COALESCE(OLD.valor, 0)),
               updated_at = now()
         WHERE cost_center_id = NEW.cost_center_id
           AND ano = EXTRACT(YEAR FROM OLD.created_at)
           AND (mes IS NULL OR mes = EXTRACT(MONTH FROM OLD.created_at));
    END IF;

    RETURN NEW;
END;
$$;

-- 5) Reconciliacao dos saldos existentes (padrao de recalculate_saldo_comprometido).
--    NAO e executada por esta migration: e ferramenta de manutencao, chamada pelo dono.
--    Recalcula comprometido/utilizado de todas as linhas do centro de custo a partir do
--    ciclo real (solicitacoes que retem orcamento + pedidos em gasto).
CREATE OR REPLACE FUNCTION public.recalculate_department_budgets(p_cost_center_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_afetadas INTEGER := 0;
    r RECORD;
    v_comprometido NUMERIC;
    v_utilizado NUMERIC;
BEGIN
    FOR r IN
        SELECT b.id, b.cost_center_id, b.ano, b.mes
          FROM public.department_budgets b
         WHERE p_cost_center_id IS NULL OR b.cost_center_id = p_cost_center_id
    LOOP
        SELECT COALESCE(SUM(s.valor_estimado), 0)
          INTO v_comprometido
          FROM public.solicitacoes s
         WHERE s.cost_center_id = r.cost_center_id
           AND s.status NOT IN ('cancelada', 'rejeitada')
           AND NOT EXISTS (
                 SELECT 1 FROM public.pedidos p
                  WHERE p.solicitacao_id = s.id
                    AND p.status IN ('aprovado', 'enviado', 'em_transito', 'entregue', 'parcial')
               )
           AND EXTRACT(YEAR FROM s.created_at) = r.ano
           AND (r.mes IS NULL OR EXTRACT(MONTH FROM s.created_at) = r.mes);

        SELECT COALESCE(SUM(p.valor_total), 0)
          INTO v_utilizado
          FROM public.pedidos p
          JOIN public.solicitacoes s ON s.id = p.solicitacao_id
         WHERE s.cost_center_id = r.cost_center_id
           AND p.status IN ('aprovado', 'enviado', 'em_transito', 'entregue', 'parcial')
           AND EXTRACT(YEAR FROM s.created_at) = r.ano
           AND (r.mes IS NULL OR EXTRACT(MONTH FROM s.created_at) = r.mes);

        v_utilizado := v_utilizado + COALESCE((
            SELECT SUM(pg.valor)
              FROM public.pagamentos pg
             WHERE pg.cost_center_id = r.cost_center_id
               AND pg.pedido_id IS NULL
               AND pg.status = 'pago'
               AND EXTRACT(YEAR FROM pg.created_at) = r.ano
               AND (r.mes IS NULL OR EXTRACT(MONTH FROM pg.created_at) = r.mes)
        ), 0);

        UPDATE public.department_budgets
           SET valor_comprometido = v_comprometido,
               valor_utilizado = v_utilizado,
               updated_at = now()
         WHERE id = r.id;

        v_afetadas := v_afetadas + 1;
    END LOOP;

    RETURN v_afetadas;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.solicitacao_retem_orcamento(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_department_budgets(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.recalculate_department_budgets(uuid) TO service_role;

COMMIT;