CREATE OR REPLACE FUNCTION public.recalculate_department_budgets(p_cost_center_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
