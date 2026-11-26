-- Etapa 116 (QA NEG-15, parte 1/2): a RPC find_approval_rule escolhia a regra de alcada sem escopo de
-- empresa e com desempate oposto ao da outra implementacao da mesma regra
-- (src/hooks/useApprovalRules.ts:19-21 ordena prioridade DESC, valor_min ASC).
--
-- 1) Escopo: por ser SECURITY DEFINER a funcao ignora a RLS de approval_rules por construcao, entao
--    varria as regras de todas as empresas. Passa a exigir que o tenant da regra pertenca a organizacao
--    do usuario autenticado (public.tenant_in_my_group, o mesmo helper das policies de tenant).
--    approval_rules.tenant_id e NOT NULL, logo o filtro e total: sem usuario/organizacao o retorno e
--    NULL (fail-closed) em vez de devolver a regra de outra empresa.
-- 2) Desempate: valor_min DESC -> ASC, alinhado ao front (no empate de prioridade vence a menor faixa).
--
-- Reversao preparada e NAO aplicada em docs/qa/reverts/20261125150000_find_approval_rule_escopo_tenant_revert.sql

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
    AND public.tenant_in_my_group(tenant_id)
  ORDER BY
    CASE WHEN categoria_id IS NOT NULL THEN 0 ELSE 1 END, -- Prefer category-specific rules
    prioridade DESC,
    valor_min ASC
  LIMIT 1;

  RETURN v_rule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.find_approval_rule(numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_approval_rule(numeric, uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.find_approval_rule(numeric, uuid) FROM PUBLIC;