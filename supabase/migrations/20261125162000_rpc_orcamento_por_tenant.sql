-- ============================================
-- MIGRATION: orcamento por tenant na RPC de desempenho de centro de custo (FN-01)
-- Data: 2026-11-24
--
-- Problema: existiam DUAS sobrecargas de public.get_cost_center_performance_report:
--   (a) sem argumento, SECURITY DEFINER, unico filtro "cc.is_active = true": devolvia o
--       orcamento de TODAS as empresas para qualquer chamador authenticated, porque a RLS
--       nao se aplica a funcao que roda como o dono. E justamente a sobrecarga que o
--       relatorio da UI chama (src/components/compras/CostCenterPerformanceAnalysis.tsx:30,
--       src/lib/supabaseRpc.ts:204).
--   (b) com p_organization_id uuid, SECURITY INVOKER: a intencao do filtro estava certa,
--       mas esta quebrada em producao. Usa cc.organization_id (essa coluna NAO existe em
--       cost_centers; o tenant dela e tenant_id) e faz al.entity_id::uuid sobre
--       audit_logs.entity_id, que e text. Chamada real em producao devolve
--       HTTP 400 {"code":"42703","message":"column cc.organization_id does not exist"},
--       o que deixa useBudgetManagement (src/hooks/useBudgetManagement.ts:45) quebrada.
--
-- Correcao (uma unica implementacao, sem mudar o que a tela ja mostra hoje):
--   1. a sobrecarga com argumento passa a ser a implementacao real, mantendo o mesmo
--      agregado que a de zero argumento entrega (is_active, alertas de 90% de uso,
--      ORDER BY usage_percentage DESC), mais:
--        - guarda de tenant igual as irmas get_*_kpis: p_organization_id diferente de
--          public.get_user_grupo_id() aborta com ERRCODE 42501 (forbidden);
--        - filtro explicito public.tenant_in_my_group(cc.tenant_id) - exatamente o
--          predicado da policy cost_centers_select_grupo - no lugar da coluna inexistente;
--        - db.organization_id = p_organization_id no ON do LEFT JOIN, para orcamento de
--          outra organizacao nao inflar o total (o LEFT JOIN preserva o centro de custo
--          mesmo sem linha de orcamento);
--        - fim do cast al.entity_id::uuid: a sobrecarga nao le mais audit_logs.
--   2. a sobrecarga sem argumento vira casca fina que delega para get_user_grupo_id():
--      a chamada atual da UI continua funcionando (nenhuma janela de tela quebrada entre
--      esta migration e o deploy do front) e deixa de vazar dados de outra empresa.
--   3. a sobrecarga com argumento perde PUBLIC/anon (fica authenticated + service_role),
--      como ja foi feito na de zero argumento.
--
-- Idempotente: DROP ... IF EXISTS + CREATE OR REPLACE + REVOKE/GRANT.
-- Reversao: docs/qa/reverts/20261125162000_rpc_orcamento_por_tenant_revert.sql
--   (recria as duas sobrecargas exatamente como estao em producao hoje).
-- ============================================

DROP FUNCTION IF EXISTS public.get_cost_center_performance_report(uuid);

CREATE OR REPLACE FUNCTION public.get_cost_center_performance_report(p_organization_id uuid)
 RETURNS TABLE(cost_center_id uuid, cost_center_name text, cost_center_code text, total_budget numeric, total_committed numeric, total_used numeric, available_balance numeric, usage_percentage numeric, alerts_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF p_organization_id IS DISTINCT FROM public.get_user_grupo_id() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        cc.id,
        cc.name,
        cc.code,
        COALESCE(SUM(db.valor_total), 0) as total_budget,
        COALESCE(SUM(db.valor_comprometido), 0) as total_committed,
        COALESCE(SUM(db.valor_utilizado), 0) as total_used,
        COALESCE(SUM(db.valor_total - db.valor_comprometido - db.valor_utilizado), 0) as available_balance,
        CASE
            WHEN COALESCE(SUM(db.valor_total), 0) > 0
            THEN (COALESCE(SUM(db.valor_comprometido + db.valor_utilizado), 0) / SUM(db.valor_total)) * 100
            ELSE 0
        END as usage_percentage,
        COUNT(db.id) FILTER (WHERE (db.valor_comprometido + db.valor_utilizado) > (db.valor_total * 0.9)) as alerts_count
    FROM public.cost_centers cc
    LEFT JOIN public.department_budgets db
           ON cc.id = db.cost_center_id
          AND db.organization_id = p_organization_id
    WHERE cc.is_active = true
      AND public.tenant_in_my_group(cc.tenant_id)
    GROUP BY cc.id, cc.name, cc.code
    ORDER BY usage_percentage DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_cost_center_performance_report()
 RETURNS TABLE(cost_center_id uuid, cost_center_name text, cost_center_code text, total_budget numeric, total_committed numeric, total_used numeric, available_balance numeric, usage_percentage numeric, alerts_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        p.cost_center_id,
        p.cost_center_name,
        p.cost_center_code,
        p.total_budget,
        p.total_committed,
        p.total_used,
        p.available_balance,
        p.usage_percentage,
        p.alerts_count
    FROM public.get_cost_center_performance_report(public.get_user_grupo_id()) AS p;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_cost_center_performance_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cost_center_performance_report(uuid) TO authenticated, service_role;

-- repete o estado de grants que a sobrecarga de zero argumento ja tem em producao:
-- CREATE OR REPLACE preserva a ACL, mas assim a migration tambem protege um ambiente novo
REVOKE EXECUTE ON FUNCTION public.get_cost_center_performance_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cost_center_performance_report() TO authenticated, service_role;
