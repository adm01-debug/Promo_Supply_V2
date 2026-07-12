
CREATE TABLE IF NOT EXISTS public.secret_rotation_schedule (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_name        text NOT NULL UNIQUE,
  description        text,
  owner_user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rotation_days      integer NOT NULL CHECK (rotation_days BETWEEN 7 AND 730),
  last_rotated_at    timestamptz NOT NULL DEFAULT now(),
  next_due_at        timestamptz NOT NULL DEFAULT now(),
  last_notified_at   timestamptz,
  last_notified_bucket text,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secret_rotation_next_due
  ON public.secret_rotation_schedule(next_due_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.secret_rotation_schedule TO authenticated;
GRANT ALL ON public.secret_rotation_schedule TO service_role;

ALTER TABLE public.secret_rotation_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage secret rotation schedule" ON public.secret_rotation_schedule;
CREATE POLICY "Admins manage secret rotation schedule"
  ON public.secret_rotation_schedule
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.tg_secret_rotation_maintain()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.next_due_at := NEW.last_rotated_at + make_interval(days => NEW.rotation_days);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_secret_rotation_maintain ON public.secret_rotation_schedule;
CREATE TRIGGER trg_secret_rotation_maintain
  BEFORE INSERT OR UPDATE ON public.secret_rotation_schedule
  FOR EACH ROW EXECUTE FUNCTION public.tg_secret_rotation_maintain();

CREATE OR REPLACE FUNCTION public.check_secret_rotation_due()
RETURNS TABLE(notified_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record; v_days int; v_bucket text; v_count int := 0;
  v_start timestamptz := clock_timestamp();
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

    IF (r.last_notified_bucket IS DISTINCT FROM v_bucket
        OR r.last_notified_at IS NULL
        OR r.last_notified_at::date < now()::date)
       AND r.owner_user_id IS NOT NULL
    THEN
      INSERT INTO public.notifications (user_id, type, title, message, priority, metadata)
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
                           'bucket', v_bucket, 'days_left', v_days)
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
$$;

REVOKE EXECUTE ON FUNCTION public.check_secret_rotation_due() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_secret_rotation_due() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check_secret_rotation_due_daily') THEN
    PERFORM cron.unschedule('check_secret_rotation_due_daily');
  END IF;
  PERFORM cron.schedule('check_secret_rotation_due_daily', '0 6 * * *',
    $cron$SELECT public.check_secret_rotation_due();$cron$);
END $$;
