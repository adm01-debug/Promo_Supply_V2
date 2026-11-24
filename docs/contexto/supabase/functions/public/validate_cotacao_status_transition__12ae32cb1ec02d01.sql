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
    WHEN 'pendente' THEN valid_targets := ARRAY['analisando', 'aprovada', 'rejeitada', 'expirada'];
    WHEN 'analisando' THEN valid_targets := ARRAY['aprovada', 'rejeitada', 'expirada'];
    -- 'aprovada' e terminal: o CHECK de cotacoes nao tem 'cancelada'
    WHEN 'aprovada' THEN valid_targets := ARRAY[]::text[];
    WHEN 'rejeitada' THEN valid_targets := ARRAY['pendente'];
    WHEN 'expirada' THEN valid_targets := ARRAY[]::text[];
    ELSE valid_targets := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(valid_targets)) THEN
    RAISE EXCEPTION 'Transição de status de cotação inválida: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$function$
