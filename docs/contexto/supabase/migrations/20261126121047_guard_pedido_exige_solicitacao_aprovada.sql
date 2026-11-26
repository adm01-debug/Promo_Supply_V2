-- NEG-06 / etapa 087: nada exigia que a solicitacao estivesse aprovada para
-- gerar uma ordem de compra.
--
-- Causa (medida no codigo do main): a tela GerarOrdem.tsx:253 e o hook
-- usePedidos.ts:171 passaram a recusar solicitacao nao aprovada (etapa 088),
-- mas nada no banco impedia um INSERT direto em pedidos - nem a FK
-- pedidos.solicitacao_id (que nao olha status), nem o trigger
-- auto_transition_solicitacao_on_pedido_created (que so age WHERE status =
-- 'aprovada', ou seja, em silencio quando a solicitacao esta pendente).
-- Resultado: qualquer caminho que nao passe pela tela (RPC, importacao, chamada
-- direta ao PostgREST com o JWT do comprador - a policy "Buyers can manage
-- orders" permite FOR ALL) emitia OC para compra nao aprovada.
--
-- Correcao: trigger BEFORE INSERT que recusa pedido cujo solicitacao_id aponte
-- para solicitacao fora de ('aprovada', 'em_andamento'). 'em_andamento' e aceito
-- de proposito: e o estado em que a propria solicitacao fica depois do primeiro
-- pedido (trigger auto_transition_solicitacao_on_pedido_created) e o segundo
-- fornecedor da mesma compra precisa poder emitir a OC dele.
--
-- pedidos.solicitacao_id continua opcional (20251220181110_c3da115e...sql:203):
-- pedido sem solicitacao (compra avulsa) nao e afetado.
--
-- Sistema (postgres/service_role) passa direto, como em guard_solicitacao_escrita
-- (20261113123738_comprador_nao_altera_dados_de_outros.sql:77-81) - assim
-- rotinas de dados nao quebram.
--
-- Reversao: supabase/rollbacks/20261126121047_revert_guard_pedido_exige_solicitacao_aprovada.sql

CREATE OR REPLACE FUNCTION public.guard_pedido_exige_solicitacao_aprovada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status TEXT;
BEGIN
  IF NEW.solicitacao_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  SELECT s.status INTO v_status
  FROM public.solicitacoes s
  WHERE s.id = NEW.solicitacao_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Solicitacao % nao encontrada para a ordem de compra', NEW.solicitacao_id
      USING ERRCODE = '23503';
  END IF;

  IF v_status NOT IN ('aprovada', 'em_andamento') THEN
    RAISE EXCEPTION 'Ordem de compra exige solicitacao aprovada (solicitacao % esta em %)',
      NEW.solicitacao_id, v_status
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$

DROP TRIGGER IF EXISTS a1_guard_pedido_exige_solicitacao_aprovada ON public.pedidos

CREATE TRIGGER a1_guard_pedido_exige_solicitacao_aprovada
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.guard_pedido_exige_solicitacao_aprovada()
