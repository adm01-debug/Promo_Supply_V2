-- Remover restrição antiga baseada em texto
ALTER TABLE public.department_budgets 
DROP CONSTRAINT IF EXISTS department_budgets_centro_custo_ano_mes_key;

-- Adicionar nova restrição baseada no ID formal do centro de custo
-- Usando COALESCE no mês para tratar orçamentos anuais (onde mes é NULL)
CREATE UNIQUE INDEX idx_unique_budget_period ON public.department_budgets (cost_center_id, ano, (COALESCE(mes, 0)));

-- Adicionar comentário para documentação
COMMENT ON INDEX idx_unique_budget_period IS 'Garante que não existam dois orçamentos para o mesmo centro de custo no mesmo ano/mês.';
