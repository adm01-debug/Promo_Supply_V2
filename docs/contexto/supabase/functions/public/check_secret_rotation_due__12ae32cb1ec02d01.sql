CREATE OR REPLACE FUNCTION public.check_secret_rotation_due()
 RETURNS TABLE(notified_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record; v_days int; v_bucket text; v_count int := 0;
  v_start timestamptz := clock_timestamp();
  v_tenant uuid;
BEGIN
  FOR r IN SELECT * FROM public.secret_rotation_schedule
           WHERE next_due_at <= now() + interval '30 days'
  LOOP
    v_days := GREATEST(0, EXTRACT(DAY FROM (r.next_due_at - now()))::int);
    v_bucket := CASE
      WHEN v_days <= 0 THEN 'overdue'
      WHEN v_days <= 1 THEN 'due_1d'
      WHEN v_days <= 7 THEN 'due_7d'
      ELSE 'due_30d'
    END;

    v_tenant := COALESCE(
      (SELECT ut.tenant_id FROM public.user_tenants ut
        WHERE ut.user_id = r.owner_user_id AND ut.is_default ORDER BY ut.joined_at LIMIT 1),
      (SELECT p.tenant_id FROM public.profiles p
        WHERE p.user_id = r.owner_user_id AND p.tenant_id IN (SELECT t.id FROM public.tenants t) LIMIT 1)
    );

    IF (r.last_notified_bucket IS DISTINCT FROM v_bucket
        OR r.last_notified_at IS NULL
        OR r.last_notified_at::date < now()::date)
       AND r.owner_user_id IS NOT NULL
       AND v_tenant IS NOT NULL
    THEN
      INSERT INTO public.notifications (user_id, type, title, message, priority, data, tenant_id)
      VALUES (
        r.owner_user_id, 'secret_rotation_due',
        CASE v_bucket
          WHEN 'overdue' THEN 'Segredo vencido: ' || r.secret_name
          WHEN 'due_1d'  THEN 'Rotação amanhã: ' || r.secret_name
          WHEN 'due_7d'  THEN 'Rotação em 7 dias: ' || r.secret_name
          ELSE 'Rotação em 30 dias: ' || r.secret_name
        END,
        COALESCE(r.description, r.secret_name) ||
          ' — próximo vencimento em ' || to_char(r.next_due_at, 'DD/MM/YYYY'),
        CASE v_bucket WHEN 'overdue' THEN 'urgent' WHEN 'due_1d' THEN 'high' ELSE 'medium' END,
        jsonb_build_object('secret_id', r.id, 'secret_name', r.secret_name,
                           'bucket', v_bucket, 'days_left', v_days),
        v_tenant
      );
      v_count := v_count + 1;

      UPDATE public.secret_rotation_schedule
      SET last_notified_at = now(), last_notified_bucket = v_bucket
      WHERE id = r.id;
    END IF;
  END LOOP;

  INSERT INTO public.health_scan_runs
    (started_at, finished_at, total_scanners, ok_count, failed_count, duration_ms, results)
  VALUES (v_start, clock_timestamp(), 1, 1, 0,
          EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start))::int,
          jsonb_build_object('scan','check_secret_rotation_due','notified',v_count));

  RETURN QUERY SELECT v_count;
END;
$function$
