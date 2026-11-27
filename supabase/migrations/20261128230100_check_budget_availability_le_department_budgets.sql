-- Etapas 090 e 137 (NEG-08): a trava de orcamento lia cost_centers, um ledger que
-- ninguem escreve, enquanto o consumo real vai para department_budgets.
--
-- Evidencia de producao (run 45891758943):
--   * SELECT count(*) FROM budget_transactions = 0, e nenhum caminho do repo insere nela,
--     entao tr_budget_transaction_update nunca roda e cost_centers.committed_amount /
--     used_amount ficam congelados. Hoje check_budget_availability devolve
--     budget_available = total_budget - (comprometido + utilizado), praticamente o
--     orcamento inteiro, mesmo com o centro de custo estourado.
--   * department_budgets tem o consumo real, por ano e por mes, escrito pelos gatilhos de
--     solicitacao/pedido/pagamento (corrigidos na 20261128230000).
--
-- O que muda: passa a ler department_budgets na linha ANUAL do ano de referencia
-- (mes IS NULL), que e o total do ano e o valor que os gatilhos mantem espelhado; quando
-- o centro de custo nao tem linha anual (ex.: Logistica, Marketing e RH em producao hoje
-- nao tem nenhuma linha), cai para cost_centers para nao bloquear quem nunca teve
-- orcamento cadastrado na tabela nova.
--
-- O contrato JSON consumido pelo front NAO muda: available, has_budget, budget_total,
-- budget_available, message (src/components/compras/NovaSolicitacaoModal.tsx:55-57,
-- src/features/solicitacoes/hooks/useSolicitacoes.ts:194-210,
-- src/components/compras/solicitacao/SolicitacaoFormSteps.tsx:39-41). Dois campos
-- aditivos identificam a fonte do numero: budget_source e budget_year.
--
-- Centro de custo sem orcamento em nenhuma das duas fontes: has_budget = false,
-- available = true (nao ha restricao a violar) - antes devolvia available = false para
-- qualquer valor > 0, bloqueando solicitacoes de centros de custo sem orcamento.
--
-- Fora do escopo desta migration, por decisao do dono: o guard BEFORE INSERT em
-- solicitacoes e a transformacao da excecao de prioridade 'urgente' em aprovacao extra
-- (hoje e bypass em src/features/solicitacoes/hooks/useSolicitacoes.ts:150-154).
--
-- Reversao: supabase/rollbacks/20261128230100_revert_check_budget_availability_le_department_budgets.sql

BEGIN;

DROP FUNCTION IF EXISTS public.check_budget_availability(uuid, numeric);

CREATE OR REPLACE FUNCTION public.check_budget_availability(
    p_cost_center_id UUID,
    p_valor NUMERIC,
    p_data DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_ano INTEGER := EXTRACT(YEAR FROM COALESCE(p_data, CURRENT_DATE))::INTEGER;
    v_cc_name TEXT;
    v_total NUMERIC;
    v_committed NUMERIC;
    v_used NUMERIC;
    v_available NUMERIC;
    v_source TEXT;
    v_valor NUMERIC := COALESCE(p_valor, 0);
BEGIN
    SELECT c.name INTO v_cc_name
      FROM public.cost_centers c
     WHERE c.id = p_cost_center_id;

    -- Fonte principal: orcamento anual do centro de custo (o que os gatilhos alimentam).
    SELECT COALESCE(b.valor_total, 0), COALESCE(b.valor_comprometido, 0), COALESCE(b.valor_utilizado, 0)
      INTO v_total, v_committed, v_used
      FROM public.department_budgets b
     WHERE b.cost_center_id = p_cost_center_id
       AND b.ano = v_ano
       AND b.mes IS NULL
     ORDER BY b.updated_at DESC
     LIMIT 1;

    IF FOUND THEN
        v_source := 'department_budgets_ano';
    ELSE
        -- Fallback: centro de custo sem linha anual (cadastro antigo) usa as colunas dele.
        SELECT COALESCE(c.total_budget, 0), COALESCE(c.committed_amount, 0), COALESCE(c.used_amount, 0)
          INTO v_total, v_committed, v_used
          FROM public.cost_centers c
         WHERE c.id = p_cost_center_id;

        IF FOUND THEN
            v_source := 'cost_centers';
        ELSE
            v_source := 'sem_orcamento';
            v_total := 0; v_committed := 0; v_used := 0;
        END IF;
    END IF;

    v_available := v_total - (v_committed + v_used);

    IF v_total <= 0 THEN
        RETURN json_build_object(
            'available', true,
            'has_budget', false,
            'budget_total', v_total,
            'budget_available', v_available,
            'message', 'Centro de custo sem orçamento cadastrado' ||
                       COALESCE(' para ' || v_cc_name, '') || '; solicitação liberada sem trava orçamentária.',
            'budget_source', v_source,
            'budget_year', v_ano
        );
    END IF;

    IF v_available >= v_valor THEN
        RETURN json_build_object(
            'available', true,
            'has_budget', true,
            'budget_total', v_total,
            'budget_available', v_available,
            'message', 'Saldo disponível no centro de custo ' || COALESCE(v_cc_name, ''),
            'budget_source', v_source,
            'budget_year', v_ano
        );
    ELSE
        RETURN json_build_object(
            'available', false,
            'has_budget', true,
            'budget_total', v_total,
            'budget_available', v_available,
            'message', 'Saldo insuficiente no centro de custo ' || COALESCE(v_cc_name, '') ||
                       '. Disponível: ' || v_available,
            'budget_source', v_source,
            'budget_year', v_ano
        );
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_budget_availability(uuid, numeric, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_budget_availability(uuid, numeric, date) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';