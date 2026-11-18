CREATE OR REPLACE FUNCTION public.update_estoque_saldo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.tipo IN ('entrada', 'ajuste') AND NEW.quantidade > 0) OR (NEW.tipo = 'saida' AND NEW.quantidade < 0) THEN
             UPDATE public.estoque 
             SET quantidade_atual = quantidade_atual + NEW.quantidade,
                 updated_at = now()
             WHERE id = NEW.estoque_id;
        ELSIF (NEW.tipo = 'saida' AND NEW.quantidade > 0) THEN
             UPDATE public.estoque 
             SET quantidade_atual = quantidade_atual - NEW.quantidade,
                 updated_at = now()
             WHERE id = NEW.estoque_id;
        ELSE
             UPDATE public.estoque 
             SET quantidade_atual = quantidade_atual + NEW.quantidade,
                 updated_at = now()
             WHERE id = NEW.estoque_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
