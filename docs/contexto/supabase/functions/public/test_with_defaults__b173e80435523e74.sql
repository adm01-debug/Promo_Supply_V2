CREATE OR REPLACE FUNCTION public.test_with_defaults(p_organization_id uuid, p_period text DEFAULT '6m'::text, p_category_id uuid DEFAULT NULL::uuid, p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v JSONB; BEGIN SELECT jsonb_build_object('solicitacao', COUNT(*) FILTER (WHERE s.status IN ('pendente', 'em_cotacao')), 'cotacao', COUNT(*) FILTER (WHERE s.status IN ('em_cotacao', 'aprovada')), 'pedido', (SELECT COUNT(*) FROM pedidos WHERE organization_id = p_organization_id AND status IN ('pendente', 'aprovado')), 'pagamento', (SELECT COUNT(*) FROM pagamentos WHERE organization_id = p_organization_id AND status IN ('pendente', 'aprovado', 'agendado')), 'transito', (SELECT COUNT(*) FROM pedidos WHERE organization_id = p_organization_id AND status IN ('enviado', 'em_transito')), 'entregue', (SELECT COUNT(*) FROM pedidos WHERE organization_id = p_organization_id AND status = 'entregue')) INTO v FROM solicitacoes s WHERE s.organization_id = p_organization_id; RETURN v; END; $function$
