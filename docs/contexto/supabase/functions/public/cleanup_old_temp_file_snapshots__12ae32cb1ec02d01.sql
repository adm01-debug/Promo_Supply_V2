CREATE OR REPLACE FUNCTION public.cleanup_old_temp_file_snapshots()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_deleted bigint;
BEGIN
  DELETE FROM public.temp_file_snapshots WHERE captured_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  INSERT INTO public.health_scan_runs(scanner_name, started_at, finished_at, status, findings_count, details)
  VALUES ('cleanup_temp_file_snapshots', now(), now(), 'ok', v_deleted, jsonb_build_object('deleted', v_deleted));
END;
$function$
