-- ---------------------------------------------------------------------------
-- Etapa 159/160 (EDG-03, parte do alert-dispatcher) - claim atomico da fila
-- de alertas.
--
-- PROBLEMA
--   O job 113 (alert-dispatcher-1min) invoca a edge a cada minuto. A edge
--   selecionava a fila com `.is("dispatched_at", null).order(created_at)
--   .limit(50)` -- sem lock e sem posse -- e so' carimbava `dispatched_at` no
--   fim do fan-out, depois de Slack (3x5s) + e-mail (3x8s) + webhook (3x6s)
--   por alerta. Duas rodadas sobrepostas pegavam as MESMAS linhas e
--   entregavam o mesmo alerta duas vezes. Na outbox o mesmo furo ja foi
--   fechado em 20261127150000 com `claim_outbox_batch`; o dispatcher ficou de
--   fora porque nao havia estado de posse em `system_alerts`.
--
-- O QUE ESTA MIGRATION FAZ
--   1. `system_alerts.dispatch_lease_until` -- carimbo de posse do worker,
--      separado de `dispatched_at` (que, desde 182/188, significa ENTREGUE).
--   2. Indice parcial da fila (`dispatched_at IS NULL`), que e' o filtro real
--      do worker.
--   3. `public.claim_alerts_batch(p_batch_size)` SECURITY DEFINER: reserva o
--      lote com FOR UPDATE SKIP LOCKED e lease de 10 min (mesmo valor da
--      outbox), devolvendo as linhas ja' possuidas. O fan-out de UM alerta
--      fecha em menos de 1 min (pior caso = todas as URLs com 3 tentativas),
--      entao 10 min cobrem a janela em que a linha esta em uso; o worker
--      libera o lease explicitamente ao terminar cada alerta (ver
--      alert-dispatcher/index.ts) para que a falha volte na rodada seguinte de
--      1 min, como antes. Se o worker morrer, o lease expira sozinho -- nao
--      existe linha presa para sempre.
--
-- O QUE NAO MUDOU: nenhum status novo (`dispatch_status` continua com os
-- valores de dispatchStatus.ts), `resolved_at` nao passou a filtrar (a edge
-- hoje entrega alerta resolvido e nao despachado -- mudar isso seria regra de
-- negocio nova), e o silencio por (alert_type, tenant) continua no worker.
-- ---------------------------------------------------------------------------

-- Guarda de rollback: se a coluna ja existir, a migration nao e' reaplicavel
-- sem perder o lease em curso; o rollback remove coluna e funcao.
ALTER TABLE public.system_alerts
  ADD COLUMN IF NOT EXISTS dispatch_lease_until TIMESTAMPTZ;

COMMENT ON COLUMN public.system_alerts.dispatch_lease_until IS
  'Posse temporaria do alert-dispatcher (claim_alerts_batch). NULL = livre. rollback:dispatch_lease:20261128198000';

CREATE INDEX IF NOT EXISTS idx_system_alerts_fila_dispatch
  ON public.system_alerts (created_at)
  WHERE dispatched_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_alerts_batch(p_batch_size integer DEFAULT 50)
RETURNS SETOF public.system_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_lease interval := interval '10 minutes';
BEGIN
  -- Teto duro: o worker pede 50; acima de 200 a rodada de 1 min nao fecha.
  v_limit := greatest(1, least(coalesce(p_batch_size, 50), 200));

  RETURN QUERY
  WITH claimed AS (
    SELECT a.id
      FROM public.system_alerts a
     WHERE a.dispatched_at IS NULL
       AND (a.dispatch_lease_until IS NULL OR a.dispatch_lease_until < now())
       AND upper(a.severity) IN ('HIGH', 'CRITICAL', 'EMERGENCY')
     ORDER BY a.created_at
     LIMIT v_limit
       FOR UPDATE SKIP LOCKED
  )
  UPDATE public.system_alerts a
     SET dispatch_lease_until = now() + v_lease
    FROM claimed c
   WHERE a.id = c.id
  RETURNING a.*;
END;
$$;

COMMENT ON FUNCTION public.claim_alerts_batch(integer) IS
  'Reserva atomica de lote de system_alerts (FOR UPDATE SKIP LOCKED + lease de 10 min). Uso exclusivo do worker alert-dispatcher.';

REVOKE ALL ON FUNCTION public.claim_alerts_batch(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_alerts_batch(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_alerts_batch(integer) TO service_role;

-- Prova: a transacao aborta se qualquer peca nao estiver no lugar. O run do
-- workflow so' fica verde se tudo abaixo passar.
DO $prova$
DECLARE
  v_def text;
  v_security boolean;
  v_col boolean;
  v_ids uuid[];
  v_n integer;
BEGIN
  SELECT d IS NOT NULL INTO v_col
    FROM (SELECT col_description('public.system_alerts'::regclass,
            (SELECT attnum FROM pg_attribute
              WHERE attrelid = 'public.system_alerts'::regclass
                AND attname = 'dispatch_lease_until'
                AND NOT attisdropped)) ) AS s(d);

  IF v_col IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'coluna system_alerts.dispatch_lease_until ausente';
  END IF;

  SELECT p.prosecdef, pg_get_functiondef(p.oid)
    INTO v_security, v_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'claim_alerts_batch'
     AND pg_get_function_identity_arguments(p.oid) = 'p_batch_size integer';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'funcao public.claim_alerts_batch(integer) ausente';
  END IF;
  IF v_security IS NOT TRUE THEN
    RAISE EXCEPTION 'claim_alerts_batch perdeu SECURITY DEFINER';
  END IF;
  IF v_def NOT ILIKE '%FOR UPDATE SKIP LOCKED%' THEN
    RAISE EXCEPTION 'claim_alerts_batch sem FOR UPDATE SKIP LOCKED';
  END IF;
  IF v_def NOT ILIKE '%dispatch_lease_until%' THEN
    RAISE EXCEPTION 'claim_alerts_batch nao carimba dispatch_lease_until';
  END IF;
  IF v_def NOT ILIKE '%set search_path = public%' AND v_def NOT ILIKE '%SET search_path TO ''public''%' THEN
    RAISE EXCEPTION 'claim_alerts_batch sem search_path fixo';
  END IF;

  -- Fumaca: executa o claim de verdade no banco em que a migration roda e
  -- devolve os leases que ele reivindicou. Sem isso, um erro de runtime na
  -- funcao (tipo, coluna, lock) so' apareceria na primeira rodada do cron,
  -- quando os alertas reais ja' estariam parados. O lease e' devolvido logo
  -- abaixo, entao nenhum alerta fica preso por causa da migration.
  SELECT array_agg(id) INTO v_ids FROM public.claim_alerts_batch(50);
  v_n := coalesce(array_length(v_ids, 1), 0);
  IF v_ids IS NOT NULL THEN
    UPDATE public.system_alerts
       SET dispatch_lease_until = NULL
     WHERE id = ANY (v_ids);
  END IF;
  RAISE NOTICE 'claim_alerts_batch fumaca: % linha(s) reivindicada(s) e devolvida(s)', v_n;
END;
$prova$;