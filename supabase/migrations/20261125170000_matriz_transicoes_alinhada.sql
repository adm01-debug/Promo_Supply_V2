-- Etapa 123 (FN-02, parte 1 de 3): as matrizes de transicao de status dos
-- triggers divergiam do vocabulario que as CHECK constraints das tabelas
-- aceitam.
--
-- Efeito medido em producao antes desta migration:
--   * pagamentos: 'aprovado -> parcial', 'agendado -> parcial' e
--     'atrasado -> parcial' eram recusados com "Transicao de status invalida",
--     mas sao exatamente os caminhos de pagamento parcial do produto
--     (src/hooks/usePagamentos.ts:41-49 e o modal de aplicacao de credito).
--     O trigger tratava 'parcial' como estado posterior a 'pago'.
--   * pedidos: 'parcial -> cancelado' era recusado, embora o front ofereca
--     cancelar um pedido entregue em parte.
--   * cotacoes: o trigger autorizava o destino 'cancelada', que a constraint
--     cotacoes_status_check nao conhece - o destino mais claro era um erro cru
--     de constraint em vez de regra de negocio.
--
-- Depois desta migration a matriz do banco e o superconjunto exato do que o
-- front oferece (src/hooks/usePagamentos.ts:41-49,
-- src/features/pedidos/hooks/usePedidos.ts:63-72) e todo destino continua
-- dentro do vocabulario da respectiva CHECK constraint. 'cancelada' sai do
-- trigger de cotacoes em vez de entrar na constraint: nunca existiu linha
-- nesse status (producao usa aprovada/expirada/rejeitada) e a tela nao tem
-- rotulo para ele - abrir um estado que a UI nao renderiza seria pior que
-- alinhar o trigger ao vocabulario real.
--
-- Nenhuma tabela, coluna, constraint ou policy e alterada: so o corpo das tres
-- funcoes de trigger. Idempotente (CREATE OR REPLACE).
--
-- Reversao: docs/qa/reverts/20261125170000_matriz_transicoes_alinhada_revert.sql

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
    -- pagamento parcial nasce de um pagamento ainda nao quitado
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
$function$;