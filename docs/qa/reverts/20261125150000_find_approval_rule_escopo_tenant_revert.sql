-- Reversao da migration 20261125150000_find_approval_rule_escopo_tenant.sql (etapa 116).
-- NAO e aplicada automaticamente: fica fora de supabase/migrations/ de proposito, para que nenhum
-- runner de migration a execute. Rodar manualmente apenas se a 116 precisar ser desfeita.
-- Restaura a versao anterior: sem filtro de tenant e com desempate valor_min DESC.

CREATE OR REPLACE FUNCTION public.find_approval_rule(p_valor NUMERIC, p_categoria_id UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_rule_id UUID;
BEGIN
  SELECT id INTO v_rule_id
  FROM public.approval_rules
  WHERE ativo = true
    AND p_valor >= valor_min
    AND p_valor <= valor_max
    AND (categoria_id IS NULL OR categoria_id = p_categoria_id)
  ORDER BY
    CASE WHEN categoria_id IS NOT NULL THEN 0 ELSE 1 END,
    prioridade DESC,
    valor_min DESC
  LIMIT 1;

  RETURN v_rule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.find_approval_rule(numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_approval_rule(numeric, uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.find_approval_rule(numeric, uuid) FROM PUBLIC;