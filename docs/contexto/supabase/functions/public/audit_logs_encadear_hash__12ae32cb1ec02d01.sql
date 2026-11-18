CREATE OR REPLACE FUNCTION public.audit_logs_encadear_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  anterior text;
BEGIN
  -- Serializa a montagem da cadeia: dois INSERTs concorrentes nao podem
  -- encadear no mesmo antecessor. Liberado no fim da transacao.
  PERFORM pg_advisory_xact_lock(hashtext('public.audit_logs.chain')::bigint);

  NEW.sequencia := nextval('public.audit_logs_sequencia_seq');

  SELECT a.registro_hash
    INTO anterior
    FROM public.audit_logs a
   WHERE a.sequencia IS NOT NULL
   ORDER BY a.sequencia DESC
   LIMIT 1;

  NEW.hash_anterior := coalesce(anterior, 'GENESIS');
  NEW.registro_hash := encode(
    sha256((public.audit_log_conteudo_canonico(NEW) || '|' || NEW.hash_anterior)::bytea),
    'hex'
  );

  RETURN NEW;
END;
$function$
