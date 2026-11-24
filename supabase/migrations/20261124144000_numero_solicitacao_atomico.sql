-- ==================================================================
-- PROMO SUPPLY - numero da solicitacao gerado dentro do INSERT
-- ==================================================================
-- problema: receive-os-sync chamava generate_sequential_number por RPC e fazia
-- o INSERT depois. O pg_advisory_xact_lock da funcao vive so ate o fim da
-- transacao do RPC, entao duas entregas simultaneas liam o mesmo MAX+1 e a
-- segunda quebrava em solicitacoes_numero_key -> HTTP 500 -> o Champions
-- marcava failed e reenfileirava o mesmo pedido para sempre.
--
-- correcao: o numero passa a ser preenchido por um trigger BEFORE INSERT. O
-- trigger roda dentro da transacao do INSERT, entao o advisory lock fica
-- retido ate o COMMIT: a transacao concorrente espera e le o MAX+1 ja comitado.
--
-- compatibilidade: quando o chamador manda numero (telas), o trigger nao mexe.
-- Só preenche quando vem nulo ou vazio. A edge deixa de mandar numero.
-- ==================================================================

CREATE OR REPLACE FUNCTION public.assign_numero_solicitacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.numero IS NULL OR btrim(NEW.numero) = '' THEN
    NEW.numero := public.generate_sequential_number('SOL', 'solicitacoes');
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.assign_numero_solicitacao() IS
  'Preenche solicitacoes.numero dentro da transacao do INSERT. O advisory xact lock de generate_sequential_number fica retido ate o COMMIT, o que elimina a corrida que gerava solicitacoes_numero_key duplicado.';

REVOKE ALL ON FUNCTION public.assign_numero_solicitacao() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_assign_numero_solicitacao ON public.solicitacoes;

CREATE TRIGGER trg_assign_numero_solicitacao
  BEFORE INSERT ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_numero_solicitacao();