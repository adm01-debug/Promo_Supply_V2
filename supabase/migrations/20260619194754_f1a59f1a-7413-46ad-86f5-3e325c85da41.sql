-- ============================================================
-- FASE 1: Endurecer execução de funções SECURITY DEFINER
-- - Revoga EXECUTE de PUBLIC e anon em TODAS as funções do schema public
-- - Concede EXECUTE a authenticated APENAS para funções
--   efetivamente chamadas pelo cliente (RPC) ou usadas em policies RLS
-- - Funções de trigger / internas seguem executáveis apenas pelo owner
--   (triggers rodam com privilégios do owner — não exigem GRANT)
-- ============================================================

-- 1) Revogar de forma ampla (idempotente)
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT n.nspname AS schema_name,
           p.proname  AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind = 'f'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      f.schema_name, f.func_name, f.args
    );
  END LOOP;
END;
$$;

-- 2) Conceder EXECUTE apenas onde necessário

-- 2a) Helpers usados em policies RLS (precisam de EXECUTE pelos roles que
--     avaliam a policy — anon para policies públicas, authenticated p/ logados)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid)                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_organization()                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_ip_blocked(text)                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fx_convert(numeric, character, character, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mask_sensitive_data(jsonb)                 TO authenticated;

-- 2b) RPCs invocadas pelo cliente via supabase.rpc(...)
GRANT EXECUTE ON FUNCTION public.count_legacy_storage_urls()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_sequential_number(text, text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_workflow_sod(uuid, uuid, uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_login_lockout(text)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_approval_rule(numeric, uuid)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_approver(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_failed_login_count(text, integer)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_login_attempt(text, text, text, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, text, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, jsonb, jsonb, jsonb) TO authenticated;

-- 2c) Dashboards / KPIs (admin/buyer scoped — gated por organization_id no payload)
GRANT EXECUTE ON FUNCTION public.get_compras_dashboard_metrics(uuid, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cost_center_performance_report()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fornecedores_kpis(uuid)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pedidos_kpis(uuid)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_solicitacoes_kpis(uuid)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_supplier_qualification_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_saldo_comprometido(uuid)       TO authenticated;

-- 2d) Limpeza/manutenção — somente service_role (cron/edge functions)
GRANT EXECUTE ON FUNCTION public.cleanup_expired_challenges()               TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_telemetry()                    TO service_role;

-- Observação: service_role bypassa GRANTs (superuser-like via PostgREST),
-- então funções acima continuam acessíveis por edge functions sem mais GRANTs.
-- Funções de trigger (validate_*_status_transition, sync_budget_on_payment,
-- auto_*, trigger_*, log_cotacao_action, calc_*, sanitize_*, enforce_audit_integrity,
-- handle_*, update_*, check_telemetry_alerts, update_licitacao_best_bid,
-- recalculate_all_solicitacao_cotacoes, trg_cotacao_approved_transition)
-- não precisam de GRANT — triggers executam sob o owner.
