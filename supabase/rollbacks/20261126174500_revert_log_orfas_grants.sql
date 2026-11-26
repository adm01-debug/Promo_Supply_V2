-- Reversao da etapa 146 (DB-08). Nao aplicada: volta os grants e a policy de leitura ampla.
BEGIN;
DO $$
DECLARE
  t       text;
  tabelas text[] := ARRAY[
    'audit_logs_202605','audit_logs_202606','audit_logs_202607','audit_logs_202608','audit_logs_202609',
    'audit_logs_legacy_20260712',
    'telemetry_logs_202605','telemetry_logs_202606','telemetry_logs_202607','telemetry_logs_202608','telemetry_logs_202609',
    'telemetry_logs_legacy_20260712'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('GRANT DELETE, UPDATE, TRUNCATE ON TABLE public.%I TO anon, authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin_read_partition" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "admin_read_partition" ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role))',
      t
    );
  END LOOP;
END
$$;
COMMIT;