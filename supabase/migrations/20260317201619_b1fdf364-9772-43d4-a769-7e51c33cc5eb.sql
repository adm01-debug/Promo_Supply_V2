
-- Fix: Allow automatic transition to 'atrasado' from pendente, aprovado, agendado
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
    WHEN 'pendente' THEN valid_targets := ARRAY['aprovado', 'cancelado', 'atrasado'];
    WHEN 'aprovado' THEN valid_targets := ARRAY['agendado', 'pago', 'cancelado', 'atrasado'];
    WHEN 'agendado' THEN valid_targets := ARRAY['pago', 'cancelado', 'atrasado'];
    WHEN 'pago' THEN valid_targets := ARRAY['parcial'];
    WHEN 'parcial' THEN valid_targets := ARRAY['pago'];
    WHEN 'cancelado' THEN valid_targets := ARRAY[]::text[];
    WHEN 'atrasado' THEN valid_targets := ARRAY['pago', 'cancelado', 'aprovado'];
    ELSE valid_targets := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(valid_targets)) THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

-- Also fix: cotacao status 'expirada' needs to be a valid target
-- Create a cotacao status validator to prevent invalid transitions
CREATE OR REPLACE FUNCTION public.validate_cotacao_status_transition()
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
    WHEN 'pendente' THEN valid_targets := ARRAY['analisando', 'aprovada', 'rejeitada', 'cancelada', 'expirada'];
    WHEN 'analisando' THEN valid_targets := ARRAY['aprovada', 'rejeitada', 'cancelada', 'expirada'];
    WHEN 'aprovada' THEN valid_targets := ARRAY['cancelada'];
    WHEN 'rejeitada' THEN valid_targets := ARRAY['pendente'];
    WHEN 'cancelada' THEN valid_targets := ARRAY[]::text[];
    WHEN 'expirada' THEN valid_targets := ARRAY[]::text[];
    ELSE valid_targets := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(valid_targets)) THEN
    RAISE EXCEPTION 'Transição de status de cotação inválida: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

-- Add cotacao status validator trigger
CREATE TRIGGER trg_validate_cotacao_status
BEFORE UPDATE ON public.cotacoes
FOR EACH ROW
EXECUTE FUNCTION public.validate_cotacao_status_transition();
