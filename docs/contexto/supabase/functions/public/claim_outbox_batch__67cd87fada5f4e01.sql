CREATE OR REPLACE FUNCTION public.claim_outbox_batch(p_batch_size integer DEFAULT 20)
 RETURNS SETOF integration_outbox
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer;
  v_lease interval := interval '10 minutes';
BEGIN
  -- Teto duro: o worker pede 20; nada acima de 100 evita varredura gigante.
  v_limit := greatest(1, least(coalesce(p_batch_size, 20), 100));

  RETURN QUERY
  WITH claimed AS (
    SELECT o.id
      FROM public.integration_outbox o
     WHERE o.status IN ('pending', 'retrying')
       AND o.next_attempt_at <= now()
     ORDER BY o.next_attempt_at
     LIMIT v_limit
       FOR UPDATE SKIP LOCKED
  )
  UPDATE public.integration_outbox o
     SET next_attempt_at = now() + v_lease
    FROM claimed c
   WHERE o.id = c.id
  RETURNING o.*;
END;
$function$
