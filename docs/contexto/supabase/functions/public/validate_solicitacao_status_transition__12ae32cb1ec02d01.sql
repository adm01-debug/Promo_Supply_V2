CREATE OR REPLACE FUNCTION public.validate_solicitacao_status_transition()
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
$function$
