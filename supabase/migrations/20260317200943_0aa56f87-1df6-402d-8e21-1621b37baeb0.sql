
-- Attach existing automation functions as triggers

-- 1. Auto-approve low-value solicitações (<R$1000)
CREATE TRIGGER trg_auto_approve_low_value
BEFORE INSERT ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_low_value_solicitacao();

-- 2. When cotação is approved → solicitação moves to 'em_andamento'
CREATE TRIGGER trg_auto_transition_on_cotacao_approval
AFTER UPDATE ON public.cotacoes
FOR EACH ROW
EXECUTE FUNCTION public.auto_transition_solicitacao_on_cotacao_approval();

-- 3. When pedido is delivered → solicitação moves to 'concluída'
CREATE TRIGGER trg_auto_transition_on_pedido_delivery
AFTER UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.auto_transition_solicitacao_on_pedido_delivery();

-- 4. Auto-create pagamento when pedido is delivered
CREATE TRIGGER trg_auto_create_pagamento_on_delivery
AFTER UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_pagamento_on_delivery();

-- 5. Auto-update supplier score on delivery
CREATE TRIGGER trg_auto_update_supplier_score
AFTER UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.auto_update_supplier_score_on_delivery();

-- 6. Recalculate saldo comprometido on pedido changes
CREATE TRIGGER trg_update_saldo_on_pedido
AFTER INSERT OR UPDATE OR DELETE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_saldo_on_pedido();

-- 7. Recalculate saldo comprometido on pagamento changes
CREATE TRIGGER trg_update_saldo_on_pagamento
AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_saldo_on_pagamento();

-- 8. Validate status transitions
CREATE TRIGGER trg_validate_solicitacao_status
BEFORE UPDATE ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.validate_solicitacao_status_transition();

CREATE TRIGGER trg_validate_pedido_status
BEFORE UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.validate_pedido_status_transition();

CREATE TRIGGER trg_validate_pagamento_status
BEFORE UPDATE ON public.pagamentos
FOR EACH ROW
EXECUTE FUNCTION public.validate_pagamento_status_transition();

-- 9. Recalculate qualification scores
CREATE TRIGGER trg_recalculate_qualification_score
AFTER INSERT OR UPDATE ON public.supplier_documents
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_qualification_score();

-- 10. updated_at triggers for core tables
CREATE TRIGGER trg_update_solicitacoes_updated_at BEFORE UPDATE ON public.solicitacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_update_pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_update_pagamentos_updated_at BEFORE UPDATE ON public.pagamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_update_cotacoes_updated_at BEFORE UPDATE ON public.cotacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
