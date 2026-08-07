
CREATE OR REPLACE FUNCTION public.tg_secret_rotation_maintain()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.next_due_at := NEW.last_rotated_at + make_interval(days => NEW.rotation_days);
  RETURN NEW;
END;
$$;
