
-- Validation trigger for solicitacoes status transitions
CREATE OR REPLACE FUNCTION public.validate_solicitacao_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  valid_targets text[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'pendente' THEN valid_targets := ARRAY['em_cotacao', 'aprovada', 'rejeitada', 'cancelada'];
    WHEN 'em_cotacao' THEN valid_targets := ARRAY['aprovada', 'rejeitada', 'cancelada'];
    WHEN 'aprovada' THEN valid_targets := ARRAY['em_andamento', 'cancelada'];
    WHEN 'em_andamento' THEN valid_targets := ARRAY['concluida', 'cancelada'];
    WHEN 'rejeitada' THEN valid_targets := ARRAY['pendente'];
    WHEN 'concluida' THEN valid_targets := ARRAY[]::text[];
    WHEN 'cancelada' THEN valid_targets := ARRAY[]::text[];
    ELSE valid_targets := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(valid_targets)) THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_solicitacao_status
  BEFORE UPDATE OF status ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_solicitacao_status_transition();

-- Validation trigger for pedidos status transitions
CREATE OR REPLACE FUNCTION public.validate_pedido_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  valid_targets text[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'pendente' THEN valid_targets := ARRAY['aprovado', 'cancelado'];
    WHEN 'aprovado' THEN valid_targets := ARRAY['enviado', 'em_transito', 'cancelado'];
    WHEN 'enviado' THEN valid_targets := ARRAY['em_transito', 'entregue', 'cancelado'];
    WHEN 'em_transito' THEN valid_targets := ARRAY['entregue', 'parcial', 'cancelado'];
    WHEN 'entregue' THEN valid_targets := ARRAY['parcial'];
    WHEN 'parcial' THEN valid_targets := ARRAY['entregue'];
    WHEN 'cancelado' THEN valid_targets := ARRAY[]::text[];
    WHEN 'concluido' THEN valid_targets := ARRAY[]::text[];
    ELSE valid_targets := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(valid_targets)) THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_pedido_status
  BEFORE UPDATE OF status ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_pedido_status_transition();

-- Validation trigger for pagamentos status transitions
CREATE OR REPLACE FUNCTION public.validate_pagamento_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  valid_targets text[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'pendente' THEN valid_targets := ARRAY['aprovado', 'cancelado'];
    WHEN 'aprovado' THEN valid_targets := ARRAY['agendado', 'pago', 'cancelado'];
    WHEN 'agendado' THEN valid_targets := ARRAY['pago', 'cancelado'];
    WHEN 'pago' THEN valid_targets := ARRAY['parcial'];
    WHEN 'parcial' THEN valid_targets := ARRAY['pago'];
    WHEN 'cancelado' THEN valid_targets := ARRAY[]::text[];
    WHEN 'atrasado' THEN valid_targets := ARRAY['pago', 'cancelado'];
    ELSE valid_targets := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(valid_targets)) THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_pagamento_status
  BEFORE UPDATE OF status ON public.pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_pagamento_status_transition();
