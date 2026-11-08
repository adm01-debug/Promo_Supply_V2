
DROP FUNCTION IF EXISTS public.scan_duplicate_indexes();

CREATE OR REPLACE FUNCTION public.scan_duplicate_indexes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_lock_key BIGINT := hashtext('scan_duplicate_indexes')::bigint;
  v_rec RECORD;
  v_severity TEXT;
  v_alerts INT := 0;
  v_pairs INT := 0;
BEGIN
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_running');
  END IF;

  FOR v_rec IN
    WITH idx AS (
      SELECT
        n.nspname AS schema_name,
        t.relname AS table_name,
        i.indexrelid,
        c.relname AS index_name,
        i.indisunique,
        i.indisprimary,
        i.indkey::text AS key_sig,
        COALESCE(pg_get_expr(i.indpred, i.indrelid), '') AS pred_sig,
        i.indclass::text AS opclass_sig,
        pg_relation_size(i.indexrelid) AS index_bytes,
        s.idx_scan
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid
      JOIN pg_class t ON t.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_stat_user_indexes s ON s.indexrelid = i.indexrelid
      WHERE n.nspname = 'public'
        AND i.indisvalid
        AND i.indisready
    ),
    grouped AS (
      SELECT
        schema_name, table_name, key_sig, pred_sig, opclass_sig,
        array_agg(index_name ORDER BY indisprimary DESC, indisunique DESC, indexrelid ASC) AS names,
        array_agg(indexrelid ORDER BY indisprimary DESC, indisunique DESC, indexrelid ASC) AS oids,
        array_agg(index_bytes ORDER BY indisprimary DESC, indisunique DESC, indexrelid ASC) AS sizes,
        array_agg(idx_scan ORDER BY indisprimary DESC, indisunique DESC, indexrelid ASC) AS scans,
        array_agg(indisunique ORDER BY indisprimary DESC, indisunique DESC, indexrelid ASC) AS uniques,
        count(*) AS n
      FROM idx
      GROUP BY schema_name, table_name, key_sig, pred_sig, opclass_sig
    )
    SELECT * FROM grouped WHERE n > 1
  LOOP
    v_pairs := v_pairs + 1;
    -- Loser = todos exceto o primeiro (vencedor)
    FOR i IN 2 .. array_length(v_rec.names, 1) LOOP
      DECLARE
        v_loser TEXT := v_rec.names[i];
        v_winner TEXT := v_rec.names[1];
        v_size BIGINT := v_rec.sizes[i];
        v_loser_unique BOOLEAN := v_rec.uniques[i];
        v_winner_unique BOOLEAN := v_rec.uniques[1];
      BEGIN
        -- Segurança extra: nunca dropar unique se vencedor não for unique
        IF v_loser_unique AND NOT v_winner_unique THEN
          CONTINUE;
        END IF;

        IF v_size >= 1024^3 THEN v_severity := 'critical';
        ELSIF v_size >= 100 * 1024^2 THEN v_severity := 'high';
        ELSIF v_size >= 10 * 1024^2 THEN v_severity := 'medium';
        ELSE v_severity := 'low';
        END IF;

        IF EXISTS (
          SELECT 1 FROM public.system_alerts
          WHERE alert_type = 'duplicate_index'
            AND metadata->>'duplicate' = v_rec.schema_name || '.' || v_loser
            AND created_at > now() - interval '14 days'
            AND (resolved_at IS NULL OR resolved_at > now() - interval '14 days')
        ) THEN
          CONTINUE;
        END IF;

        INSERT INTO public.system_alerts(alert_type, severity, title, message, metadata)
        VALUES (
          'duplicate_index',
          v_severity,
          format('Índice duplicado em %I.%I: %I (%s)',
            v_rec.schema_name, v_rec.table_name, v_loser, pg_size_pretty(v_size)),
          format('Índice %I é redundante com %I (mesmas colunas, mesmo predicate, mesma opclass). Ocupa %s desnecessário e onera writes.',
            v_loser, v_winner, pg_size_pretty(v_size)),
          jsonb_build_object(
            'duplicate', v_rec.schema_name || '.' || v_loser,
            'kept', v_rec.schema_name || '.' || v_winner,
            'table', v_rec.schema_name || '.' || v_rec.table_name,
            'size_bytes', v_size,
            'size_pretty', pg_size_pretty(v_size),
            'idx_scan_duplicate', v_rec.scans[i],
            'idx_scan_kept', v_rec.scans[1],
            'fix_sql', format('DROP INDEX CONCURRENTLY IF EXISTS %I.%I;', v_rec.schema_name, v_loser),
            'verify_sql', format('SELECT indexname, indexdef FROM pg_indexes WHERE tablename = %L;', v_rec.table_name),
            'warning', 'Confirmar que aplicação não faz hint explícito ao índice antes de dropar.'
          )
        );
        v_alerts := v_alerts + 1;
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('duplicate_groups', v_pairs, 'alerts_created', v_alerts, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.scan_duplicate_indexes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_duplicate_indexes() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan_duplicate_indexes_weekly') THEN
    PERFORM cron.unschedule('scan_duplicate_indexes_weekly');
  END IF;
  PERFORM cron.schedule(
    'scan_duplicate_indexes_weekly',
    '47 4 * * 1',
    $cron$ SELECT public.scan_duplicate_indexes(); $cron$
  );
END $$;
