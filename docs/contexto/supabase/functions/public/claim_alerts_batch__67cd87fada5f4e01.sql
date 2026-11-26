CREATE OR REPLACE FUNCTION public.claim_alerts_batch(p_batch_size integer DEFAULT 50)
 RETURNS SETOF system_alerts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer;
  v_lease interval := interval '10 minutes';
BEGIN
  -- Teto duro: o worker pede 50; acima de 200 a rodada de 1 min nao fecha.
  v_limit := greatest(1, least(coalesce(p_batch_size, 50), 200));

  RETURN QUERY
  WITH claimed AS (
    SELECT a.id
      FROM public.system_alerts a
     WHERE a.dispatched_at IS NULL
       AND (a.dispatch_lease_until IS NULL OR a.dispatch_lease_until < now())
       AND upper(a.severity) IN ('HIGH', 'CRITICAL', 'EMERGENCY')
     ORDER BY a.created_at
     LIMIT v_limit
       FOR UPDATE SKIP LOCKED
  )
  UPDATE public.system_alerts a
     SET dispatch_lease_until = now() + v_lease
    FROM claimed c
   WHERE a.id = c.id
  RETURNING a.*;
END;
$function$
