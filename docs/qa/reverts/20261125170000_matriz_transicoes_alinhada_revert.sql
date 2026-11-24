-- Reversao da migration 20261125170000_matriz_transicoes_alinhada.sql.
-- Restaura os tres corpos de trigger exatamente como estao em producao hoje
-- (capturados por pg_get_functiondef). NAO fica em supabase/migrations/ de
-- proposito: nenhum runner deve executa-la sozinho.
-- Prova de restauracao: os corpos voltam byte a byte identicos a producao
-- (md5 do prosrc 97ea4e59a47398aa0fa53c3992c77977 / 8fb80fa63ab9b42e5b225040d6962b07 /
-- fd94fbc047cf96d4ccf047ebe7290c75) e o diff das 18 transicoes testadas fica vazio.
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


CREATE OR REPLACE FUNCTION public.validate_cotacao_status_transition()
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
$function$;

