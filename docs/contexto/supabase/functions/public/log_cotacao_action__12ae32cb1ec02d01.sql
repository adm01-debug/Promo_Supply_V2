CREATE OR REPLACE FUNCTION public.log_cotacao_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_name TEXT;
    v_user_email TEXT;
BEGIN
    SELECT display_name, email INTO v_user_name, v_user_email FROM public.profiles WHERE id = v_user_id;

    IF (TG_OP = 'UPDATE' AND OLD.selecionada IS DISTINCT FROM NEW.selecionada AND NEW.selecionada = true) THEN
        INSERT INTO public.audit_logs (
            user_id, user_name, user_email, action_type, entity_type, entity_id, entity_description, new_values, metadata
        ) VALUES (
            v_user_id, v_user_name, v_user_email, 'update', 'cotacao', NEW.id, 
            'Fornecedor selecionado para a solicitação ' || NEW.solicitacao_id,
            jsonb_build_object('selecionada', true, 'justificativa', NEW.justificativa_selecao),
            jsonb_build_object('solicitacao_id', NEW.solicitacao_id, 'fornecedor_id', NEW.fornecedor_id)
        );
    END IF;
    RETURN NEW;
END;
$function$
