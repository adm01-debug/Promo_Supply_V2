-- FN-12 / etapa 154: a verificacao de integridade da auditoria acusa ADULTERADO no
-- primeiro registro remanescente depois de qualquer expurgo da retencao legal.
--
-- Causa: verificar_integridade_audit_logs (20261117210000_audit_logs_append_only_
-- hash_encadeado.sql:253) inicializava "anterior text := 'GENESIS'" e comparava contra
-- o hash_anterior do primeiro registro da cadeia (linha 266). Mas no mesmo repositorio
-- a retencao legal de 5 anos apaga a cabeca da cadeia por desenho: apply_lgpd_retention
-- faz DELETE FROM public.audit_logs WHERE created_at < now() - interval '5 years'
-- (20261113180000_corrige_crons_lgpd_e_mv_kpis.sql:42) e o trigger
-- z_audit_logs_append_only autoriza esse DELETE quando encontra 'apply_lgpd_retention'
-- na pilha de chamada. O cron lgpd_retention_daily esta ativo (03:15 UTC). No dia
-- seguinte ao primeiro expurgo, a verificacao passaria a devolver
-- 'ADULTERADO / Elo quebrado' em cima de uma trilha intacta.
--
-- Correcao: guardar a ancora no momento do expurgo.
--   1. public.audit_logs_ancora - linha unica (id boolean PRIMARY KEY CHECK (id)) com
--      sequencia e registro_hash do ultimo registro apagado;
--   2. apply_lgpd_retention grava a ancora ANTES do DELETE, escolhendo o registro de
--      maior sequencia entre os expurgados;
--   3. verificar_integridade_audit_logs inicializa "anterior" com esse hash e so cai
--      para 'GENESIS' quando nunca houve expurgo.
--
-- Atalho evitado: fazer o verificador pular o primeiro registro - isso abriria
-- exatamente a brecha que a cadeia existe para fechar (apagar o inicio da trilha
-- passaria a ser indetectavel).
--
-- Nao toca em audit_logs_bloquear_alteracao, audit_logs_bloquear_truncate nem em
-- audit_log_conteudo_canonico: mudar um byte da serializacao invalidaria todos os
-- hashes ja gravados.
--
-- Reversao: supabase/rollbacks/20261126170000_revert_ancora_cadeia_audit_logs.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Ancora da cadeia
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs_ancora (
  id            boolean     PRIMARY KEY DEFAULT true CHECK (id),
  sequencia     bigint      NOT NULL,
  registro_hash text        NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs_ancora IS
  'Ancora da cadeia de hash de audit_logs: ultimo registro apagado pela retencao legal de 5 anos. ISO 27001 A.8.15.';
COMMENT ON COLUMN public.audit_logs_ancora.registro_hash IS
  'registro_hash do ultimo registro expurgado; e o hash_anterior esperado do primeiro registro remanescente.';

-- Sem policy permissiva: so o dono da tabela (as duas funcoes SECURITY DEFINER) e
-- service_role (BYPASSRLS) leem ou escrevem a ancora.
ALTER TABLE public.audit_logs_ancora ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_logs_ancora FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. apply_lgpd_retention ancora a cadeia antes de apagar
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_lgpd_retention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_deleted bigint;
  v_started timestamptz := clock_timestamp();
BEGIN
  -- Logs de auditoria / segurança / financeiro — 5 anos (LGPD art.16)
  -- Ancora da cadeia de hash: antes de apagar, guarda sequencia e registro_hash
  -- do ULTIMO registro que vai sair. Sem isso o primeiro registro remanescente
  -- acusaria elo quebrado na verificacao (o hash_anterior dele aponta para um
  -- registro que a retencao legal apagou de proposito).
  INSERT INTO public.audit_logs_ancora (id, sequencia, registro_hash, atualizado_em)
  SELECT true, a.sequencia, a.registro_hash, clock_timestamp()
    FROM public.audit_logs a
   WHERE a.created_at < now() - interval '5 years'
     AND a.registro_hash IS NOT NULL
   ORDER BY a.sequencia DESC
   LIMIT 1
  ON CONFLICT (id) DO UPDATE
     SET sequencia     = EXCLUDED.sequencia,
         registro_hash = EXCLUDED.registro_hash,
         atualizado_em = EXCLUDED.atualizado_em;

  DELETE FROM public.audit_logs WHERE created_at < now() - interval '5 years';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('audit_logs', v_deleted);

  DELETE FROM public.security_logs WHERE created_at < now() - interval '5 years';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('security_logs', v_deleted);

  DELETE FROM public.financial_audit_logs WHERE created_at < now() - interval '5 years';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('financial_audit_logs', v_deleted);

  -- Acesso / rate-limit — 180 dias
  DELETE FROM public.login_attempts WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('login_attempts', v_deleted);

  DELETE FROM public.geo_access_logs WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('geo_access_logs', v_deleted);

  DELETE FROM public.rate_limit_logs WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('rate_limit_logs', v_deleted);

  -- Telemetria — 90 dias
  DELETE FROM public.telemetry_logs WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('telemetry_logs', v_deleted);

  DELETE FROM public.query_telemetry WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('query_telemetry', v_deleted);

  DELETE FROM public.wal_rate_snapshots WHERE captured_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('wal_rate_snapshots', v_deleted);

  DELETE FROM public.deadlock_snapshots WHERE captured_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('deadlock_snapshots', v_deleted);

  -- Webhooks processados — 90 dias
  DELETE FROM public.webhook_events
    WHERE created_at < now() - interval '90 days'
      AND status IN ('processed','failed','skipped');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('webhook_events', v_deleted);

  -- Notificações lidas — 180 dias
  DELETE FROM public.notifications
    WHERE created_at < now() - interval '180 days'
      AND read = true;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('notifications_read', v_deleted);

  -- Trilha em health_scan_runs
  INSERT INTO public.health_scan_runs(scan_name, status, duration_ms, details)
  VALUES (
    'lgpd_retention',
    'success',
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int,
    v_result
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.health_scan_runs(scan_name, status, duration_ms, details)
  VALUES (
    'lgpd_retention',
    'error',
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int,
    jsonb_build_object('error', SQLERRM, 'partial', v_result)
  );
  RAISE;
END;
$$;
-- ---------------------------------------------------------------------------
-- 3. O verificador parte da ancora
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verificar_integridade_audit_logs()
RETURNS TABLE(
  situacao             text,
  total_registros      bigint,
  verificados_ate      bigint,
  primeiro_divergente  uuid,
  sequencia_divergente bigint,
  detalhe              text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  linha     public.audit_logs;
  anterior  text;
  esperado  text;
  total     bigint;
  contados  bigint := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem verificar a integridade da auditoria'
      USING ERRCODE = '42501';
  END IF;

  -- Sem ancora (nunca houve expurgo) a cadeia comeca em GENESIS; com expurgo, o
  -- elo inicial e o hash do ultimo registro apagado - exatamente o que o primeiro
  -- registro remanescente declara em hash_anterior.
  SELECT a.registro_hash INTO anterior FROM public.audit_logs_ancora a WHERE a.id;

  anterior := coalesce(anterior, 'GENESIS');

  SELECT count(*) INTO total FROM public.audit_logs;

  FOR linha IN SELECT * FROM public.audit_logs ORDER BY sequencia LOOP
    IF linha.hash_anterior IS DISTINCT FROM anterior THEN
      situacao             := 'ADULTERADO';
      total_registros      := total;
      verificados_ate      := contados;
      primeiro_divergente  := linha.id;
      sequencia_divergente := linha.sequencia;
      detalhe              := format(
        'Elo quebrado: registro aponta para hash anterior %s, mas a cadeia calculou %s. Indica remocao ou reordenacao de registro.',
        coalesce(linha.hash_anterior, '(nulo)'), anterior);
      RETURN NEXT;
      RETURN;
    END IF;

    esperado := encode(
      sha256((public.audit_log_conteudo_canonico(linha) || '|' || linha.hash_anterior)::bytea),
      'hex'
    );

    IF esperado IS DISTINCT FROM linha.registro_hash THEN
      situacao             := 'ADULTERADO';
      total_registros      := total;
      verificados_ate      := contados;
      primeiro_divergente  := linha.id;
      sequencia_divergente := linha.sequencia;
      detalhe              := format(
        'Conteudo alterado: hash gravado %s, hash recalculado %s. O registro foi modificado apos a gravacao.',
        linha.registro_hash, esperado);
      RETURN NEXT;
      RETURN;
    END IF;

    anterior := linha.registro_hash;
    contados := contados + 1;
  END LOOP;

  situacao             := 'INTEGRO';
  total_registros      := total;
  verificados_ate      := contados;
  primeiro_divergente  := NULL;
  sequencia_divergente := NULL;
  detalhe              := format('Cadeia integra: %s registro(s) verificados byte a byte.', contados);
  RETURN NEXT;
END;
$function$;

COMMIT;
