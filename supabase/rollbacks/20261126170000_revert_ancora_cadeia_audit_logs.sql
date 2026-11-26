-- Reversao de 20261126170000_ancora_cadeia_audit_logs.sql.
-- Nao e aplicada automaticamente (fica fora de supabase/migrations de proposito).
-- Devolve as duas funcoes ao texto vigente antes desta migration e remove a ancora.

BEGIN;

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
  anterior  text := 'GENESIS';
  esperado  text;
  total     bigint;
  contados  bigint := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem verificar a integridade da auditoria'
      USING ERRCODE = '42501';
  END IF;

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

DROP TABLE IF EXISTS public.audit_logs_ancora;

COMMIT;
