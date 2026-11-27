-- Reversao de 20261128180000_rls_logs_arquivo_tenant.sql (etapa 066). Nao aplicada automaticamente.
DO $rb$
DECLARE
  v_tabela text;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY[
    'audit_logs_202605', 'audit_logs_202606', 'audit_logs_202607',
    'audit_logs_202608', 'audit_logs_202609', 'audit_logs_legacy_20260712',
    'telemetry_logs',
    'telemetry_logs_202605', 'telemetry_logs_202606', 'telemetry_logs_202607',
    'telemetry_logs_202608', 'telemetry_logs_202609', 'telemetry_logs_legacy_20260712'
  ] LOOP
    IF to_regclass('public.' || v_tabela) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_isolation_' || v_tabela, v_tabela);
  END LOOP;
END $rb$;