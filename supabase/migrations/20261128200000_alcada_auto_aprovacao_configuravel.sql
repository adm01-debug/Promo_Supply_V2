-- feat(banco): alcada de auto-aprovacao configuravel (etapa 114 - NEG-14, parte 1/2)
--
-- Causa raiz: o gatilho trg_auto_approve_low_value aprovava sozinho TODA solicitacao com
-- valor_estimado < 1000, com o numero escrito dentro da funcao. A alcada minima existe em
-- dois lugares que nao se falavam com o gatilho: approval_rules (Matriz de Alcada, editavel
-- em src/components/compras/DynamicApprovalMatrix.tsx) e cost_centers.approval_threshold
-- (editavel em src/pages/configuracoes/ConfiguracoesCentroCusto.tsx).
--
-- Agora o limite efetivo e' o MENOR entre as fontes configuradas -- nada e' aprovado sozinho
-- acima do que qualquer uma delas exigiria aprovar:
--   1. approval_rules ativas do tenant/organizacao -> menor valor_min (0 = nenhum automatico,
--      a escada cobre todos os valores);
--   2. cost_centers.approval_threshold do centro de custo da propria solicitacao (<= 0 = nao
--      configurado);
--   3. R$ 1.000 quando nada estiver configurado (comportamento legado).
--
-- Sem regra ativa e sem centro de custo na solicitacao -- estado de producao em 26/11/2026
-- (0 linhas em approval_rules, 0 de 296 solicitacoes com cost_center_id) -- o comportamento e'
-- identico ao anterior. Nao regride; passa a respeitar o que o negocio configurar.
--
-- Idempotente: CREATE OR REPLACE (mesma assinatura).
-- Nao toca em guard_solicitacao_escrita nem em nenhum outro gatilho de solicitacoes.

CREATE OR REPLACE FUNCTION public.auto_approve_low_value_solicitacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tenant uuid;
  v_limite_regra numeric;
  v_limite_centro numeric;
  v_limite numeric;
  v_limite_txt text;
BEGIN
  -- tenant real (o front manda o organization_id em tenant_id; a_fill_tenant_id corrige quando ha
  -- auth.uid(), mas sem sessao o valor pode continuar sendo o id da organizacao)
  v_tenant := COALESCE(
    (SELECT t.id FROM public.tenants t WHERE t.id = NEW.tenant_id),
    (SELECT t.id FROM public.tenants t
      WHERE t.organization_id = COALESCE(NEW.organization_id, NEW.tenant_id)
      ORDER BY t.created_at LIMIT 1)
  );

  IF NEW.status = 'pendente' AND NEW.valor_estimado IS NOT NULL THEN
    -- 1) piso da Matriz de Alcada do tenant/organizacao (sem regra ativa = sem piso)
    SELECT min(r.valor_min) INTO v_limite_regra
      FROM public.approval_rules r
     WHERE r.ativo
       AND ((v_tenant IS NOT NULL AND r.tenant_id = v_tenant)
         OR (NEW.organization_id IS NOT NULL AND r.organization_id = NEW.organization_id));

    -- 2) limite do centro de custo da solicitacao (0 ou nulo = nao configurado)
    IF NEW.cost_center_id IS NOT NULL THEN
      SELECT cc.approval_threshold INTO v_limite_centro
        FROM public.cost_centers cc
       WHERE cc.id = NEW.cost_center_id;
      IF v_limite_centro IS NOT NULL AND v_limite_centro <= 0 THEN
        v_limite_centro := NULL;
      END IF;
    END IF;

    -- 3) menor limite configurado vence; sem configuracao nenhuma, mantem o legado de R$ 1.000
    v_limite := least(
      COALESCE(v_limite_regra, v_limite_centro, 1000),
      COALESCE(v_limite_centro, v_limite_regra, 1000)
    );

    IF NEW.valor_estimado < v_limite THEN
      NEW.status := 'aprovada';
      v_limite_txt := 'R$ ' || replace(round(v_limite, 2)::text, '.', ',');

      -- Create notification for the requester
      INSERT INTO public.notifications (user_id, title, message, type, priority, tenant_id)
      SELECT NEW.solicitante_id,
             'Solicitação auto-aprovada',
             'A solicitação #' || NEW.numero || ' foi aprovada automaticamente (valor abaixo da alçada de ' || v_limite_txt || ')',
             'approval',
             'normal',
             v_tenant
      WHERE NEW.solicitante_id IS NOT NULL AND v_tenant IS NOT NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.auto_approve_low_value_solicitacao() IS
  'Auto-aprova solicitacao pendente abaixo da alcada configurada: menor valor entre o piso da Matriz de Alcada (approval_rules.valor_min), o approval_threshold do centro de custo e o legado de R$ 1.000 (etapa 114).';