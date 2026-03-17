
-- Trigger: When cotação is approved (selecionada = true), set solicitação to 'em_andamento'
CREATE OR REPLACE FUNCTION public.trg_cotacao_approved_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.selecionada = true AND (OLD.selecionada IS DISTINCT FROM NEW.selecionada) AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE solicitacoes 
    SET status = 'em_andamento', updated_at = now()
    WHERE id = NEW.solicitacao_id 
    AND status IN ('pendente', 'aprovada', 'cotacao');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cotacao_approved_status ON cotacoes;
CREATE TRIGGER trg_cotacao_approved_status
  AFTER UPDATE ON cotacoes
  FOR EACH ROW
  EXECUTE FUNCTION trg_cotacao_approved_transition();

-- Trigger: When pedido status = 'entregue', set solicitação to 'concluida'
CREATE OR REPLACE FUNCTION public.trg_pedido_entregue_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solicitacao_id uuid;
  v_fornecedor_id uuid;
  v_valor numeric;
  v_next_num text;
BEGIN
  IF NEW.status = 'entregue' AND OLD.status IS DISTINCT FROM 'entregue' THEN
    -- Get solicitacao_id from pedido
    v_solicitacao_id := NEW.solicitacao_id;
    
    -- Update solicitação to concluída
    IF v_solicitacao_id IS NOT NULL THEN
      UPDATE solicitacoes 
      SET status = 'concluida', data_conclusao = now(), updated_at = now()
      WHERE id = v_solicitacao_id;
    END IF;

    -- Auto-create pagamento for delivered order
    IF NEW.fornecedor_id IS NOT NULL AND NEW.valor_total > 0 THEN
      SELECT 'PAG-' || LPAD((COUNT(*) + 1)::text, 6, '0') INTO v_next_num FROM pagamentos;
      
      INSERT INTO pagamentos (
        numero, fornecedor_id, pedido_id, valor, 
        data_vencimento, status
      ) VALUES (
        v_next_num, 
        NEW.fornecedor_id, 
        NEW.id, 
        NEW.valor_total,
        (CURRENT_DATE + INTERVAL '30 days')::date,
        'pendente'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedido_entregue_status ON pedidos;
CREATE TRIGGER trg_pedido_entregue_status
  AFTER UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION trg_pedido_entregue_transition();

-- Trigger: When solicitação is approved, auto-transition to 'cotacao' status
CREATE OR REPLACE FUNCTION public.trg_solicitacao_approved_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprovada' AND OLD.status IS DISTINCT FROM 'aprovada' THEN
    NEW.status := 'cotacao';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solicitacao_approved_auto ON solicitacoes;
CREATE TRIGGER trg_solicitacao_approved_auto
  BEFORE UPDATE ON solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION trg_solicitacao_approved_transition();
