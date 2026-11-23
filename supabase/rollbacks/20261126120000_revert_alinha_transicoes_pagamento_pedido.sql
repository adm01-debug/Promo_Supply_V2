-- Reversao da etapa 085 (NEG-05). Restaura as funcoes de transicao exatamente
-- como estavam em producao antes de 20261126120000_alinha_transicoes_pagamento_pedido.sql.
-- NAO e aplicada automaticamente: fica fora de supabase/migrations/ de proposito.
-- Aplicar somente se a migration 085 precisar ser desfeita.

CREATE OR REPLACE FUNCTION public.validate_pagamento_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_pedido_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
$function$;