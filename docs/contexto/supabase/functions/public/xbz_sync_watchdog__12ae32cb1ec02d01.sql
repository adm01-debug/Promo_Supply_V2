CREATE OR REPLACE FUNCTION public.xbz_sync_watchdog()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'cron'
AS $function$
DECLARE
  v_last_data timestamptz;
  v_pedidos int;
  v_cred_ativas int;
  v_open_alert uuid;
  v_stale boolean;
  v_motivo text;
BEGIN
  -- Saude medida pelo dado espelhado, nao pelo agendador.
  SELECT count(*), max(last_synced_at) INTO v_pedidos, v_last_data
  FROM public.xbz_pedidos;

  SELECT count(*) INTO v_cred_ativas
  FROM public.xbz_credentials c
  WHERE c.deleted_at IS NULL
    AND coalesce(c.is_active, true);

  v_stale := v_pedidos = 0
          OR v_last_data IS NULL
          OR v_last_data < now() - interval '2 hours';

  v_motivo := CASE
    WHEN v_cred_ativas = 0 THEN 'sem_credencial'
    WHEN v_pedidos = 0 THEN 'sem_pedidos_ou_falha_api'
    WHEN v_stale THEN 'dados_desatualizados'
    ELSE 'ok'
  END;

  SELECT id INTO v_open_alert
  FROM public.system_alerts
  WHERE alert_type = 'xbz_sync_stalled'
    AND resolved_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_stale THEN
    IF v_open_alert IS NULL THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, message, metadata)
      VALUES (
        'xbz_sync_stalled',
        'high',
        CASE WHEN v_cred_ativas = 0
          THEN 'Integracao XBZ sem credencial cadastrada'
          ELSE 'Sincronizacao XBZ parada' END,
        CASE WHEN v_cred_ativas = 0
          THEN 'Nenhuma credencial XBZ ativa esta cadastrada: o catalogo e os pedidos XBZ nao sincronizam. Cadastre em Catalogo XBZ > Credenciais.'
          ELSE format('Nenhum pedido XBZ novo ha mais de 2 horas (ultimo: %s).', coalesce(v_last_data::text, 'nunca')) END,
        jsonb_build_object(
          'motivo', v_motivo,
          'pedidos_espelhados', v_pedidos,
          'credenciais_ativas', v_cred_ativas,
          'last_data', v_last_data,
          'checked_at', now()
        )
      );
    ELSE
      UPDATE public.system_alerts
      SET metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object(
             'motivo', v_motivo,
             'pedidos_espelhados', v_pedidos,
             'credenciais_ativas', v_cred_ativas,
             'last_data', v_last_data,
             'checked_at', now()
           )
      WHERE id = v_open_alert;
    END IF;
  ELSIF v_open_alert IS NOT NULL THEN
    UPDATE public.system_alerts
    SET resolved_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb)
          || jsonb_build_object('auto_resolved_at', now(), 'last_data', v_last_data)
    WHERE id = v_open_alert;
  END IF;

  RETURN jsonb_build_object(
    'stale', v_stale,
    'motivo', v_motivo,
    'pedidos_espelhados', v_pedidos,
    'credenciais_ativas', v_cred_ativas,
    'last_success', v_last_data,
    'last_failure', NULL
  );
END;
$function$
