CREATE OR REPLACE FUNCTION public.test_subselect(p_organization_id uuid, p_period text DEFAULT '6m'::text, p_category_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v JSONB; BEGIN SELECT jsonb_build_object('k', (SELECT COUNT(*) FROM pagamentos WHERE organization_id = p_organization_id AND status IN ('pendente', 'aprovado', 'agendado'))) INTO v FROM solicitacoes LIMIT 1; RETURN v; END; $function$
