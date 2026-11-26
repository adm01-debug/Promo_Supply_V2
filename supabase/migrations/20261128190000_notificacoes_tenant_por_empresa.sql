-- security(fn): multa por atraso e bloqueio de fornecedor passam a notificar so quem e da empresa do evento
-- (achado FN-05, etapa 139).
--
-- Causa: auto_calculate_delivery_penalty e auto_block_low_score_supplier sao SECURITY DEFINER e escolhiam os
-- destinatarios com "FROM user_roles ur WHERE ur.role IN ('admin','coordinator','finance')" - sem nenhum
-- predicado de empresa. user_roles e puramente (usuario, papel) e nao diz a que empresa o usuario pertence,
-- enquanto a notificacao era gravada com o tenant_id do pedido/fornecedor. Como notifications tem a policy
-- PERMISSIVE "Users can view their own notifications" (USING auth.uid() = user_id), o admin de OUTRA empresa
-- lia o numero do pedido, o valor da multa e a razao social/score do fornecedor alheio.
--
-- Correcao: o destinatario precisa ter vinculo com o tenant do evento, usando as mesmas duas fontes que
-- public.fill_tenant_id_from_profile (20261112223246) ja usa para resolver o tenant de um usuario -
-- user_tenants e profiles.tenant_id. Nada muda em user_roles, nas policies de notifications nem no valor da
-- multa.
--
-- Fail-safe: se o banco nao tiver NENHUM vinculo usuario<->tenant cadastrado em nenhuma das duas fontes, o
-- filtro deixaria os admins de fora e a multa passaria a nao avisar ninguem. Nesse caso as duas funcoes mantem
-- o comportamento anterior (todos os papeis), e o isolamento passa a valer sozinho assim que o primeiro vinculo
-- existir - a condicao e lida em tempo de execucao, nao congelada na migration.
--
-- Reversao: supabase/rollbacks/20261128190000_revert_notificacoes_tenant.sql (nao aplicada automaticamente).

CREATE OR REPLACE FUNCTION public.auto_block_low_score_supplier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_contract RECORD;
  v_tem_vinculo boolean;
BEGIN
  IF NEW.avaliacao IS NOT NULL AND (OLD.avaliacao IS NULL OR NEW.avaliacao < OLD.avaliacao) THEN
    FOR v_contract IN
      SELECT c.* FROM contracts c
      WHERE c.supplier_id = NEW.id::text
        AND c.status = 'active'
        AND c.auto_block_below_score = true
        AND c.min_supplier_score IS NOT NULL
    LOOP
      IF NEW.avaliacao < v_contract.min_supplier_score THEN
        UPDATE fornecedores SET status = 'bloqueado', updated_at = now() WHERE id = NEW.id;

        SELECT (EXISTS (SELECT 1 FROM public.user_tenants)
             OR EXISTS (SELECT 1 FROM public.profiles pf WHERE pf.tenant_id IS NOT NULL))
          INTO v_tem_vinculo;

        INSERT INTO notifications (user_id, title, message, type, priority, tenant_id)
        SELECT ur.user_id,
          'Fornecedor bloqueado: ' || NEW.razao_social,
          'O fornecedor ' || NEW.razao_social || ' foi bloqueado automaticamente. Score: ' ||
          NEW.avaliacao || ' (mínimo contratual: ' || v_contract.min_supplier_score || ').',
          'supplier_blocked', 'critical', NEW.tenant_id
        FROM user_roles ur
        WHERE ur.role IN ('admin', 'coordinator')
          AND (
            v_tem_vinculo = false
            OR EXISTS (
              SELECT 1 FROM public.user_tenants ut
              WHERE ut.user_id = ur.user_id AND ut.tenant_id = NEW.tenant_id
            )
            OR EXISTS (
              SELECT 1 FROM public.profiles pf
              WHERE (pf.user_id = ur.user_id OR pf.id = ur.user_id)
                AND pf.tenant_id = NEW.tenant_id
            )
          );

        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_calculate_delivery_penalty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_contract RECORD;
  v_days_late integer;
  v_penalty_pct numeric;
  v_penalty_val numeric;
  v_tem_vinculo boolean;
BEGIN
  IF NEW.status = 'entregue' AND OLD.status != 'entregue'
     AND NEW.data_entrega IS NOT NULL AND NEW.data_previsao IS NOT NULL
     AND NEW.data_entrega > NEW.data_previsao THEN

    FOR v_contract IN
      SELECT c.* FROM contracts c
      WHERE c.supplier_id = NEW.fornecedor_id::text
        AND c.status = 'active'
        AND c.sla_delivery_days IS NOT NULL
      ORDER BY c.created_at DESC LIMIT 1
    LOOP
      v_days_late := (NEW.data_entrega - NEW.data_previsao);
      v_penalty_pct := LEAST(
        v_days_late * COALESCE(v_contract.penalty_rate_per_day, 0.5),
        COALESCE(v_contract.penalty_cap_percent, 20)
      );
      v_penalty_val := ROUND(NEW.valor_total * v_penalty_pct / 100, 2);

      IF v_penalty_val > 0 THEN
        INSERT INTO contract_penalties (
          contract_id, pedido_id, penalty_type, description,
          days_late, penalty_percent, penalty_value, status, tenant_id
        ) VALUES (
          v_contract.id, NEW.id, 'delivery_delay',
          'Multa por atraso: ' || v_days_late || ' dia(s) de atraso no pedido ' || NEW.numero ||
          '. Taxa: ' || v_penalty_pct || '% sobre R$ ' || NEW.valor_total,
          v_days_late, v_penalty_pct, v_penalty_val, 'pending', NEW.tenant_id
        );

        SELECT (EXISTS (SELECT 1 FROM public.user_tenants)
             OR EXISTS (SELECT 1 FROM public.profiles pf WHERE pf.tenant_id IS NOT NULL))
          INTO v_tem_vinculo;

        INSERT INTO notifications (user_id, title, message, type, priority, tenant_id)
        SELECT ur.user_id,
          'Multa aplicada: ' || NEW.numero,
          'Pedido ' || NEW.numero || ' entregue com ' || v_days_late || ' dia(s) de atraso. Multa de R$ ' || v_penalty_val || ' (' || v_penalty_pct || '%) aplicada automaticamente.',
          'contract_penalty', 'high', NEW.tenant_id
        FROM user_roles ur
        WHERE ur.role IN ('admin', 'coordinator', 'finance')
          AND (
            v_tem_vinculo = false
            OR EXISTS (
              SELECT 1 FROM public.user_tenants ut
              WHERE ut.user_id = ur.user_id AND ut.tenant_id = NEW.tenant_id
            )
            OR EXISTS (
              SELECT 1 FROM public.profiles pf
              WHERE (pf.user_id = ur.user_id OR pf.id = ur.user_id)
                AND pf.tenant_id = NEW.tenant_id
            )
          );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- Prova: aborta a migration se o corpo aplicado nao filtrar pelos dois vinculos de tenant e nao seguir
-- SECURITY DEFINER. RAISE EXCEPTION desfaz a transacao inteira (aplicacao e tudo-ou-nada).
DO $prova$
DECLARE
  v_nome text;
  v_def text;
BEGIN
  FOREACH v_nome IN ARRAY ARRAY['auto_calculate_delivery_penalty', 'auto_block_low_score_supplier'] LOOP
    SELECT pg_get_functiondef(('public.' || v_nome || '()')::regprocedure) INTO v_def;

    IF v_def NOT LIKE '%ut.tenant_id = NEW.tenant_id%'
       OR v_def NOT LIKE '%pf.tenant_id = NEW.tenant_id%'
       OR v_def NOT LIKE '%public.user_tenants%' THEN
      RAISE EXCEPTION 'prova falhou: % nao restringe destinatarios ao tenant do evento', v_nome;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_proc pr
      WHERE pr.oid = ('public.' || v_nome || '()')::regprocedure
        AND pr.prosecdef
        AND pr.proconfig @> ARRAY['search_path=public']
    ) THEN
      RAISE EXCEPTION 'prova falhou: % nao e SECURITY DEFINER com search_path=public', v_nome;
    END IF;
  END LOOP;
END $prova$;