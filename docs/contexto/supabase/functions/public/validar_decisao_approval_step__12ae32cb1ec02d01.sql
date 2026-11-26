CREATE OR REPLACE FUNCTION public.validar_decisao_approval_step()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.workflow_id IS DISTINCT FROM OLD.workflow_id
     OR NEW.etapa IS DISTINCT FROM OLD.etapa
     OR NEW.aprovador_id IS DISTINCT FROM OLD.aprovador_id THEN
    RAISE EXCEPTION 'approval_steps: workflow_id, etapa e aprovador_id sao imutaveis (etapa %)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'approval_steps: etapa % ja decidida (status %) nao pode virar %', OLD.id, OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status NOT IN ('approved', 'rejected', 'skipped') THEN
      RAISE EXCEPTION 'approval_steps: status % invalido para a etapa %', NEW.status, OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
