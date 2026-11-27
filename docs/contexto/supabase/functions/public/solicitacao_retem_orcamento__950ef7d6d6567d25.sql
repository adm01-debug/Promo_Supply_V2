CREATE OR REPLACE FUNCTION public.solicitacao_retem_orcamento(p_solicitacao_id uuid, p_status text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_status IS NULL THEN false
    WHEN p_status IN ('cancelada', 'rejeitada') THEN false
    WHEN EXISTS (
      SELECT 1
        FROM public.pedidos p
       WHERE p.solicitacao_id = p_solicitacao_id
         AND p.status IN ('aprovado', 'enviado', 'em_transito', 'entregue', 'parcial')
    ) THEN false
    ELSE true
  END
$function$
