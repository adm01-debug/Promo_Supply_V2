CREATE OR REPLACE FUNCTION public.update_estoque_saldo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Guard RLS-03: o item tem de pertencer a organizacao de quem movimenta. Vale so
  -- para chamadas autenticadas; service_role/cron (auth.uid() nulo) segue como antes.
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.estoque e
      WHERE e.id = NEW.estoque_id
        AND e.organization_id = public.get_user_grupo_id()
    ) THEN
      RAISE EXCEPTION 'Movimentacao recusada: o item de estoque % nao pertence a organizacao do usuario.', NEW.estoque_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

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
