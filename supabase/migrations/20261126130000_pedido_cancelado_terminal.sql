-- O pedido cancelado e' estado terminal: a tela nao oferece nenhuma transicao a
-- partir de `cancelado` (etapa 125) e o smoke da etapa 123 alinhou o trigger nesse
-- sentido. A migration 20261126120000 (etapa 085), escrita depois mas com timestamp
-- maior, reafirmava `cancelado -> pendente` e passava a ser a ULTIMA definicao da
-- funcao - ou seja: um banco criado do zero terminaria aceitando uma transicao que o
-- front recusa. Esta migration reafirma a versao alinhada para que a ultima
-- definicao seja a mesma que o front usa.
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
    -- entrega parcial pode ser cancelada (o front ja oferecia essa acao)
    WHEN 'parcial' THEN valid_targets := ARRAY['entregue', 'cancelado'];
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
