
-- Onda 60: Retenção para tabelas de observabilidade sem cleanup
CREATE OR REPLACE FUNCTION public.cleanup_old_temp_file_snapshots()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deleted bigint;
BEGIN
  DELETE FROM public.temp_file_snapshots WHERE captured_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  INSERT INTO public.health_scan_runs(scanner_name, started_at, finished_at, status, findings_count, details)
  VALUES ('cleanup_temp_file_snapshots', now(), now(), 'ok', v_deleted, jsonb_build_object('deleted', v_deleted));
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_wal_rate_snapshots()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deleted bigint;
BEGIN
  DELETE FROM public.wal_rate_snapshots WHERE captured_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  INSERT INTO public.health_scan_runs(scanner_name, started_at, finished_at, status, findings_count, details)
  VALUES ('cleanup_wal_rate_snapshots', now(), now(), 'ok', v_deleted, jsonb_build_object('deleted', v_deleted));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_temp_file_snapshots() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_wal_rate_snapshots() FROM PUBLIC, anon, authenticated;

-- Cron: diariamente às 03:20 e 03:25 UTC
SELECT cron.schedule('cleanup-temp-file-snapshots-daily', '20 3 * * *', 'SELECT public.cleanup_old_temp_file_snapshots();');
SELECT cron.schedule('cleanup-wal-rate-snapshots-daily',  '25 3 * * *', 'SELECT public.cleanup_old_wal_rate_snapshots();');
