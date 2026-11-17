-- Corrige as rotinas de monitoramento do banco e agenda o detector de particionamento.
--
-- PROBLEMA (encontrado em 17/11/2026 executando as funcoes no banco de producao):
-- seis funcoes de saude do banco gravavam em public.system_alerts usando a coluna
-- `source`, que nao existia na tabela. Qualquer uma delas abortava com
--   ERROR 42703: column "source" of relation "system_alerts" does not exist
-- ou seja: nenhuma delas conseguia emitir alerta. Alem disso
-- maintain_monthly_partitions e scan_partition_candidates nem informavam `alert_type`,
-- que e NOT NULL.
--
-- Funcoes afetadas: maintain_monthly_partitions, scan_autovacuum_starvation,
-- scan_deadlocks_and_conflicts, scan_partition_candidates, scan_toast_bloat
-- (scan_stale_alerts ja usava as colunas certas).
--
-- CORRECAO:
--   1. `source` passa a existir (coluna aditiva, guarda a funcao que originou o alerta;
--      complementa `alert_type`, que e a categoria). Destrava as 3 funcoes que ja
--      enviavam alert_type corretamente.
--   2. maintain_monthly_partitions e scan_partition_candidates passam a informar
--      alert_type ('PARTITION_MAINTENANCE' / 'PARTITION_CANDIDATE').
--
-- CONTEXTO DE PARTICIONAMENTO (medido no banco de producao, 17/11/2026):
--   audit_logs     = 216 kB / ~22 linhas
--   telemetry_logs = 1208 kB / ~439 linhas
--   nenhuma tabela em public e particionada (pg_class.relkind = 'p' -> 0 linhas)
-- Particionar agora seria DDL destrutiva (recriar tabela + swap, com RLS e FKs) sem
-- ganho algum. A retencao ja esta ativa e segura:
--   cron 17 `lgpd_retention_daily`   -> apply_lgpd_retention(): audit_logs 5 anos
--                                       (LGPD art.16), telemetry_logs 90 dias
--   cron 3  `cleanup-telemetry-logs` -> telemetry_logs 30 dias
-- O que faltava era o aviso "chegou a hora de particionar": scan_partition_candidates
-- nao estava agendada em nenhum job. O cron abaixo fecha essa lacuna sem tocar em
-- estrutura de tabela.

-- 1. Coluna que as rotinas de alerta ja esperavam.
ALTER TABLE public.system_alerts ADD COLUMN IF NOT EXISTS source text;

COMMENT ON COLUMN public.system_alerts.source IS
  'Funcao/rotina que originou o alerta (ex.: scan_toast_bloat). Complementa alert_type.';

-- 2. Funcoes que tambem nao informavam alert_type (NOT NULL).

CREATE OR REPLACE FUNCTION public.maintain_monthly_partitions(p_parent_table text, p_ahead_months integer DEFAULT 3, p_retain_months integer DEFAULT 24)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start         DATE;
  v_end           DATE;
  v_part_name     TEXT;
  v_cutoff        DATE;
  v_partition     RECORD;
  v_created       INT := 0;
  v_dropped       INT := 0;
  v_result        JSONB;
BEGIN
  -- ── 1. Create future partitions ──────────────────────────────────────────
  FOR i IN 0..p_ahead_months - 1 LOOP
    v_start := date_trunc('month', now() + (i || ' months')::INTERVAL)::DATE;
    v_end   := (v_start + INTERVAL '1 month')::DATE;
    v_part_name := p_parent_table || '_' || to_char(v_start, 'YYYY_MM');

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_part_name
    ) THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I FOR VALUES FROM (%L) TO (%L)',
        v_part_name, p_parent_table, v_start::TEXT, v_end::TEXT
      );
      -- Enable RLS on the new partition (inherits policies, but must be explicitly enabled)
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_part_name);
      v_created := v_created + 1;
    END IF;
  END LOOP;

  -- ── 2. Drop partitions older than retention window ────────────────────────
  v_cutoff := date_trunc('month', now() - (p_retain_months || ' months')::INTERVAL)::DATE;

  FOR v_partition IN
    SELECT c.relname AS part_name,
           pg_get_expr(c.relpartbound, c.oid) AS part_bound
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    JOIN   pg_inherits i  ON i.inhrelid = c.oid
    JOIN   pg_class pp    ON pp.oid = i.inhparent
    JOIN   pg_namespace pn ON pn.oid = pp.relnamespace
    WHERE  pn.nspname = 'public' AND pp.relname = p_parent_table
      AND  n.nspname  = 'public'
      AND  c.relkind  = 'r'
  LOOP
    -- Parse the start date from the partition bound expression
    DECLARE
      v_bound_start DATE;
    BEGIN
      SELECT (regexp_match(v_partition.part_bound, 'FROM \(''([^'']+)''\)'))[1]::DATE
      INTO v_bound_start;

      IF v_bound_start IS NOT NULL AND v_bound_start < v_cutoff THEN
        -- Log before dropping
        RAISE LOG 'partition_maintenance: dropping %.% (bound_start=%, cutoff=%)',
          p_parent_table, v_partition.part_name, v_bound_start, v_cutoff;
        EXECUTE format('DROP TABLE IF EXISTS public.%I', v_partition.part_name);
        v_dropped := v_dropped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Skip unparseable bounds (non-date partitions, etc.)
      NULL;
    END;
  END LOOP;

  v_result := jsonb_build_object(
    'table',   p_parent_table,
    'created', v_created,
    'dropped', v_dropped,
    'cutoff',  v_cutoff::TEXT,
    'run_at',  now()::TEXT
  );

  -- Insert a maintenance audit row in system_alerts if anything was dropped
  IF v_dropped > 0 THEN
    INSERT INTO public.system_alerts (alert_type, severity, source, message, metadata)
    VALUES (
      'PARTITION_MAINTENANCE',
      'LOW',
      'partition_maintenance',
      format('Dropped %s old partition(s) from %I (older than %s months)', v_dropped, p_parent_table, p_retain_months),
      v_result
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.scan_partition_candidates(min_size_gb numeric DEFAULT 10)
 RETURNS TABLE(table_name text, size_gb numeric, row_estimate bigint, time_column text, suggested_action text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  r record;
  v_time_col text;
  v_size_bytes bigint;
  v_size_gb numeric;
  v_rows bigint;
  v_suggestion text;
  v_dedup_key text;
BEGIN
  FOR r IN
    SELECT c.oid, c.relname, n.nspname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'  -- ordinary table (not already partitioned 'p')
      AND NOT EXISTS (
        SELECT 1 FROM pg_partitioned_table pt WHERE pt.partrelid = c.oid
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_inherits i WHERE i.inhrelid = c.oid  -- skip partition children
      )
  LOOP
    v_size_bytes := pg_total_relation_size(r.oid);
    v_size_gb := ROUND((v_size_bytes / (1024.0 * 1024 * 1024))::numeric, 2);

    IF v_size_gb < min_size_gb THEN
      CONTINUE;
    END IF;

    SELECT reltuples::bigint INTO v_rows FROM pg_class WHERE oid = r.oid;

    -- Detect first plausible time column
    SELECT a.attname INTO v_time_col
    FROM pg_attribute a
    WHERE a.attrelid = r.oid
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.attname = ANY(ARRAY['created_at','occurred_at','event_time','timestamp','ts','logged_at','recorded_at'])
    ORDER BY array_position(
      ARRAY['created_at','occurred_at','event_time','timestamp','ts','logged_at','recorded_at']::text[],
      a.attname
    )
    LIMIT 1;

    IF v_time_col IS NULL THEN
      v_suggestion := format(
        '-- Table %I.%I (%s GB, ~%s rows) has no time column; consider PARTITION BY HASH(tenant_id) or manual review.',
        r.nspname, r.relname, v_size_gb, v_rows
      );
    ELSE
      v_suggestion := format(
        E'-- Migrate %I.%I (%s GB, ~%s rows) to partitioned table:\n-- 1. CREATE TABLE %I.%I_p (LIKE %I.%I INCLUDING ALL) PARTITION BY RANGE (%I);\n-- 2. Create monthly partitions via pg_partman or manually.\n-- 3. Migrate data in batches + swap names in a maintenance window.',
        r.nspname, r.relname, v_size_gb, v_rows,
        r.nspname, r.relname, r.nspname, r.relname, v_time_col
      );
    END IF;

    -- Dedup 30 days per table
    v_dedup_key := format('partition_candidate:%s.%s', r.nspname, r.relname);
    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE metadata->>'dedup_key' = v_dedup_key
        AND created_at > now() - interval '30 days'
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, source, title, description, metadata)
      VALUES (
        'PARTITION_CANDIDATE',
        CASE WHEN v_size_gb > 50 THEN 'HIGH' ELSE 'MEDIUM' END,
        'scan_partition_candidates',
        format('Tabela grande candidata a partitioning: %I.%I (%s GB)', r.nspname, r.relname, v_size_gb),
        format('Tabela %I.%I atingiu %s GB (~%s linhas). Partitioning reduz I/O, acelera VACUUM e permite retenção por DROP PARTITION.', r.nspname, r.relname, v_size_gb, v_rows),
        jsonb_build_object(
          'dedup_key', v_dedup_key,
          'table', format('%I.%I', r.nspname, r.relname),
          'size_gb', v_size_gb,
          'row_estimate', v_rows,
          'time_column', v_time_col,
          'suggested_action', v_suggestion
        )
      );
    END IF;

    table_name := format('%I.%I', r.nspname, r.relname);
    size_gb := v_size_gb;
    row_estimate := v_rows;
    time_column := v_time_col;
    suggested_action := v_suggestion;
    RETURN NEXT;
  END LOOP;
END;
$function$
;

-- 3. Agenda o detector semanal (domingo 04:45) com limiar real de 1 GB.
SELECT cron.unschedule('scan-particoes-semanal')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-particoes-semanal');

SELECT cron.schedule(
  'scan-particoes-semanal',
  '45 4 * * 0',
  $$SELECT public.scan_partition_candidates(1.0)$$
);
