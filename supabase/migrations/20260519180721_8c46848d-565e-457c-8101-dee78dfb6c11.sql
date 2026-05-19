-- 1. Revoke public/anon access from KPI functions
REVOKE EXECUTE ON FUNCTION public.get_pagamentos_kpis(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_pagamentos_kpis(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_fornecedores_kpis(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_fornecedores_kpis(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_compras_dashboard_metrics(uuid, text, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_compras_dashboard_metrics(uuid, text, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_pedidos_kpis(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_pedidos_kpis(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_solicitacoes_kpis(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_solicitacoes_kpis(uuid) TO authenticated;

-- 2. Revoke public/anon access from internal logic functions
REVOKE EXECUTE ON FUNCTION public.update_estoque_saldo() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_estoque_saldo() TO authenticated;
