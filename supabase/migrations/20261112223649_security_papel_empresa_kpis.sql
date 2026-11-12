-- ============================================
-- MIGRATION: fecha vazamento de papel/empresa e KPIs de outras organizações
-- Data: 2026-11-12
--
-- (1) has_role(uuid,app_role) e user_belongs_to_tenant(uuid,uuid) são SECURITY DEFINER
--     e executáveis pela API REST: qualquer um (até anon) perguntava o papel ou o tenant de
--     QUALQUER uuid (ex.: descobrir quem é admin). As 366 policies que as usam passam
--     auth.uid() (conferido em pg_policies), e as únicas chamadas com outro uuid são das
--     edges com service_role (_shared/security.ts, health-dashboard, migrate-storage-paths,
--     dependency-health). Agora: _user_id diferente de auth.uid() só é respondido para
--     chamador privilegiado (GUC role = none/postgres/service_role/supabase_admin, que é o
--     papel original do chamador mesmo dentro da SECURITY DEFINER); para anon/authenticated
--     devolve false. user_belongs_to_tenant perde EXECUTE de PUBLIC/anon (a única policy que
--     a usa é TO authenticated).
-- (2) get_pedidos_kpis, get_pagamentos_kpis, get_fornecedores_kpis e get_solicitacoes_kpis
--     (SECURITY DEFINER, authenticated) devolviam os números de qualquer p_organization_id.
--     Passam a exigir p_organization_id = get_user_grupo_id() (42501 caso contrário).
--     get_compras_dashboard_metrics já tinha a checagem; get_cost_center_performance_report
--     é SECURITY INVOKER (RLS se aplica).
-- (3) Policy permissiva antiga "tenant_isolation" (organization_id = get_my_organization())
--     liberava qualquer usuário da organização, mesmo sem papel, em ALL (inclusive
--     UPDATE/DELETE). Removida de pedidos, pagamentos, fiscal_documents e licitacoes, que
--     têm permissiva por papel cobrindo SELECT/INSERT/UPDATE/DELETE. category_strategies
--     fica como está: sem ela não sobra caminho de escrita (só "Tenant isolation for
--     category_strategies" FOR SELECT).
-- (4) sync_budget_on_payment lia pedidos.cost_center_id, coluna que não existe: todo INSERT
--     em pagamentos e todo UPDATE de status abortava. O centro de custo do pedido vem de
--     pedidos.solicitacao_id -> solicitacoes.cost_center_id. A função estava ligada a dois
--     gatilhos idênticos (trg_sync_budget_payment e sync_budget_payment_trigger); com a
--     função funcionando o orçamento seria somado duas vezes, então o duplicado sai.
--
-- Idempotente: CREATE OR REPLACE, DROP ... IF EXISTS, REVOKE/GRANT.
-- Reversão: recriar as funções pelo pg_get_functiondef anterior (corpo no PR), recriar
--   CREATE POLICY tenant_isolation ON public.<t> USING (organization_id = get_my_organization())
--   e o gatilho sync_budget_payment_trigger.
-- ============================================

-- (1) papel/tenant de outro usuário só para chamador privilegiado
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(NULLIF(current_setting('role', true), ''), 'none')
         NOT IN ('none', 'postgres', 'service_role', 'supabase_admin')
      THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$function$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id uuid, _tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(NULLIF(current_setting('role', true), ''), 'none')
         NOT IN ('none', 'postgres', 'service_role', 'supabase_admin')
      THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE user_id = _user_id AND tenant_id = _tenant_id
    )
  END
$function$;

REVOKE EXECUTE ON FUNCTION public.user_belongs_to_tenant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_tenant(uuid, uuid) TO authenticated, service_role;

-- (2) KPIs só da própria organização
CREATE OR REPLACE FUNCTION public.get_fornecedores_kpis(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
BEGIN
    IF p_organization_id IS DISTINCT FROM public.get_user_grupo_id() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'total', COUNT(*),
        'ativos', COUNT(*) FILTER (WHERE status = 'ativo'),
        'integradosApi', COUNT(*) FILTER (WHERE integrado_api = true),
        'mediaAvaliacao', COALESCE(AVG(avaliacao), 0)
    ) INTO result
    FROM fornecedores
    WHERE organization_id = p_organization_id;

    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pagamentos_kpis(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
    v_hoje DATE := CURRENT_DATE;
BEGIN
    IF p_organization_id IS DISTINCT FROM public.get_user_grupo_id() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'total', COUNT(*),
        'pendentes', COUNT(*) FILTER (WHERE status IN ('pendente', 'aprovado', 'agendado')),
        'atrasados', COUNT(*) FILTER (WHERE status IN ('pendente', 'aprovado') AND data_vencimento < v_hoje),
        'pagos', COUNT(*) FILTER (WHERE status = 'pago'),
        'valorPendente', COALESCE(SUM(valor - COALESCE(valor_pago, 0)) FILTER (WHERE status NOT IN ('pago', 'cancelado')), 0),
        'valorPago', COALESCE(SUM(valor) FILTER (WHERE status = 'pago'), 0)
    ) INTO result
    FROM pagamentos
    WHERE organization_id = p_organization_id;

    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pedidos_kpis(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
BEGIN
    IF p_organization_id IS DISTINCT FROM public.get_user_grupo_id() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'total', COUNT(*),
        'pendentes', COUNT(*) FILTER (WHERE status IN ('pendente', 'aprovado')),
        'emTransito', COUNT(*) FILTER (WHERE status IN ('em_transito', 'enviado')),
        'entregues', COUNT(*) FILTER (WHERE status = 'entregue'),
        'valorTotal', COALESCE(SUM(valor_total), 0)
    ) INTO result
    FROM pedidos
    WHERE organization_id = p_organization_id;

    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_solicitacoes_kpis(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
BEGIN
    IF p_organization_id IS DISTINCT FROM public.get_user_grupo_id() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'total', COUNT(*),
        'pendentes', COUNT(*) FILTER (WHERE status = 'pendente'),
        'emCotacao', COUNT(*) FILTER (WHERE status = 'em_cotacao'),
        'aprovadas', COUNT(*) FILTER (WHERE status = 'aprovada'),
        'concluidas', COUNT(*) FILTER (WHERE status = 'concluida'),
        'valorTotal', COALESCE(SUM(valor_estimado), 0)
    ) INTO result
    FROM solicitacoes
    WHERE organization_id = p_organization_id;

    RETURN result;
END;
$function$;

-- (3) permissiva por organização que ignorava papel
DROP POLICY IF EXISTS tenant_isolation ON public.pedidos;
DROP POLICY IF EXISTS tenant_isolation ON public.pagamentos;
DROP POLICY IF EXISTS tenant_isolation ON public.fiscal_documents;
DROP POLICY IF EXISTS tenant_isolation ON public.licitacoes;

-- (4) centro de custo do pagamento: do próprio pagamento ou da solicitação do pedido
CREATE OR REPLACE FUNCTION public.sync_budget_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cost_center_id UUID;
BEGIN
    -- Determinar o centro de custo (do pagamento ou da solicitação vinculada ao pedido)
    v_cost_center_id := COALESCE(
        NEW.cost_center_id,
        (SELECT s.cost_center_id
           FROM public.pedidos pe
           JOIN public.solicitacoes s ON s.id = pe.solicitacao_id
          WHERE pe.id = NEW.pedido_id
          LIMIT 1)
    );

    IF v_cost_center_id IS NOT NULL THEN
        -- Se o status mudou para 'pago'
        IF (NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status != 'pago')) THEN
            UPDATE public.department_budgets
            SET
                valor_utilizado = valor_utilizado + NEW.valor,
                valor_comprometido = GREATEST(0, valor_comprometido - NEW.valor)
            WHERE cost_center_id = v_cost_center_id
            AND ano = EXTRACT(YEAR FROM NEW.created_at)
            AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_budget_payment_trigger ON public.pagamentos;
