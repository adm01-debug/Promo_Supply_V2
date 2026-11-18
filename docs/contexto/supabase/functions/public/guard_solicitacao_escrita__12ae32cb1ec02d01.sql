CREATE OR REPLACE FUNCTION public.guard_solicitacao_escrita()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Sistema (postgres/service_role, funções SECURITY DEFINER), admin e coordinator passam.
  IF current_user NOT IN ('authenticated', 'anon')
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'coordinator'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pendente' THEN
      RAISE EXCEPTION 'Solicitação deve ser criada como pendente (recebido: %)', NEW.status USING ERRCODE = '42501';
    END IF;
    IF NEW.organization_id IS NOT NULL AND NEW.organization_id IS DISTINCT FROM public.get_user_grupo_id() THEN
      RAISE EXCEPTION 'Organização da solicitação não é a do usuário' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: fora da própria solicitação ainda não aprovada, só o status pode mudar.
  IF NOT (OLD.solicitante_id = auth.uid() AND OLD.status IN ('pendente', 'rejeitada'))
     AND (to_jsonb(NEW) - ARRAY['status', 'updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'updated_at']) THEN
    RAISE EXCEPTION 'Sem permissão para alterar esta solicitação' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$
