-- Etapa 085 (NEG-05, parte 1/2) - alinha as maquinas de estado de pagamentos e
-- pedidos com o que a aplicacao oferece na tela.
--
-- Por que existe: validate_pagamento_status_transition aceitava 'parcial' apenas
-- a partir de 'pago' (quitacao parcial de algo ja pago), enquanto a tela de
-- Pagamentos (src/hooks/usePagamentos.ts:42-50) e o botao 'Pagar Parcial'
-- (src/components/pagamentos/PagamentoDetailModal.tsx) tratam 'parcial' como
-- pagamento EM PARCELAS e o oferecem a partir de aprovado/agendado/atrasado.
-- Todo clique nesses estados terminava em "Transicao de status invalida".
-- Em pedidos, validate_pedido_status_transition nao aceitava 'parcial -> cancelado'
-- nem 'cancelado -> pendente' (reset para correcao), ambos oferecidos por
-- src/features/pedidos/hooks/usePedidos.ts:63-72.
--
-- Nenhum dado e alterado: apenas o conjunto de alvos aceitos por cada funcao,
-- preservando integralmente as transicoes que ja existiam.
-- Reverter: supabase/rollbacks/20261126120000_revert_alinha_transicoes_pagamento_pedido.sql
-- (fora de supabase/migrations/ de proposito, para nao ser aplicado por engano).

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
    WHEN 'aprovado' THEN valid_targets := ARRAY['agendado', 'pago', 'parcial', 'cancelado', 'atrasado'];
    WHEN 'agendado' THEN valid_targets := ARRAY['pago', 'parcial', 'cancelado', 'atrasado'];
    WHEN 'pago' THEN valid_targets := ARRAY['parcial'];
    WHEN 'parcial' THEN valid_targets := ARRAY['pago', 'cancelado'];
    WHEN 'cancelado' THEN valid_targets := ARRAY[]::text[];
    WHEN 'atrasado' THEN valid_targets := ARRAY['pago', 'parcial', 'cancelado', 'aprovado'];
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
    WHEN 'parcial' THEN valid_targets := ARRAY['entregue', 'cancelado'];
    WHEN 'cancelado' THEN valid_targets := ARRAY['pendente'];
    WHEN 'concluido' THEN valid_targets := ARRAY[]::text[];
    ELSE valid_targets := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(valid_targets)) THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$function$;