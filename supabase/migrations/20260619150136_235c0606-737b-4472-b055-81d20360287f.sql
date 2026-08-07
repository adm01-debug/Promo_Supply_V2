
DO $$
DECLARE
  fn text;
  trigger_fns text[] := ARRAY[
    'audit_pagamento_changes','auto_approve_low_value_solicitacao','auto_block_low_score_supplier',
    'auto_calculate_delivery_penalty','auto_create_pagamento_on_delivery',
    'auto_transition_solicitacao_on_cotacao_approval','auto_transition_solicitacao_on_pedido_delivery',
    'auto_update_supplier_score_on_delivery','calculate_cotacao_scores','enforce_audit_integrity',
    'handle_new_user','handle_pedido_budget_realization','handle_solicitacao_budget_change',
    'log_budget_changes','log_cotacao_action','recalculate_all_solicitacao_cotacoes',
    'sanitize_audit_metadata','sanitize_session_token','sync_budget_on_payment',
    'trg_cotacao_approved_transition','trg_pedido_entregue_transition','trg_solicitacao_approved_transition',
    'trigger_recalculate_qualification_score','trigger_update_saldo_on_pagamento',
    'trigger_update_saldo_on_pedido','update_cost_center_budget_totals','update_estoque_saldo',
    'update_licitacao_best_bid'
  ];
BEGIN
  FOREACH fn IN ARRAY trigger_fns LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I() FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- Helpers chamados só por edge functions (service_role)
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_challenges() FROM PUBLIC, anon, authenticated;
