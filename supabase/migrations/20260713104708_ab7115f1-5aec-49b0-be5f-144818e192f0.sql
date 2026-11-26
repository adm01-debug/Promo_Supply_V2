
DO $$
DECLARE
  part text;
  parts text[] := ARRAY[
    'audit_logs_202605','audit_logs_202606','audit_logs_202607','audit_logs_202608','audit_logs_202609',
    'telemetry_logs_202605','telemetry_logs_202606','telemetry_logs_202607','telemetry_logs_202608','telemetry_logs_202609'
  ];
BEGIN
  FOREACH part IN ARRAY parts LOOP
    EXECUTE format('DROP POLICY IF EXISTS "admin_read_partition" ON public.%I', part);
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all_partition" ON public.%I', part);
    EXECUTE format(
      'CREATE POLICY "admin_read_partition" ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role))',
      part
    );
    EXECUTE format(
      'CREATE POLICY "service_role_all_partition" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      part
    );
  END LOOP;
END $$;
