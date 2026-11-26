-- ---------------------------------------------------------------------------
-- Rollback da etapa 127 (DB-02): contracts.supplier_id volta a text, sem FK,
-- e a view/tres funcoes voltam à definicao vigente em producao antes da
-- migration (mesmo corpo, comparando com ::text).
--
-- Perda esperada: nenhuma linha e' removida. O que se perde e' a garantia de
-- integridade (FK) e o tipo forte; contratos passam a aceitar qualquer texto.
-- Rodar apenas se a etapa 127 precisar ser desfeita.
-- ---------------------------------------------------------------------------

drop view if exists public.supplier_compliance_summary;

drop index if exists public.idx_contracts_supplier_id;
alter table public.contracts drop constraint if exists contracts_supplier_id_fkey;

alter table public.contracts
  alter column supplier_id type text using supplier_id::text;

create view public.supplier_compliance_summary with (security_invoker = true) as
  select
    f.id as fornecedor_id,
    f.razao_social,
    f.status,
    f.avaliacao,
    coalesce(cp_agg.penalty_count, 0) as penalty_count,
    coalesce(cp_agg.total_penalty_value, 0) as total_penalty_value,
    coalesce(rc_agg.avg_quality_score, 0) as avg_quality_score,
    coalesce(sb_agg.bonus_count, 0) as bonus_count,
    coalesce(sb_agg.total_bonus_value, 0) as total_bonus_value
  from public.fornecedores f
  left join lateral (
    select count(*) as penalty_count, coalesce(sum(cp.penalty_value), 0) as total_penalty_value
    from public.contract_penalties cp
    join public.contracts c on c.id = cp.contract_id
    where c.supplier_id = f.id::text
  ) cp_agg on true
  left join lateral (
    select avg(rc.overall_score) as avg_quality_score
    from public.receiving_checklists rc
    where rc.fornecedor_id = f.id
  ) rc_agg on true
  left join lateral (
    select count(*) as bonus_count, coalesce(sum(sb.value_percent), 0) as total_bonus_value
    from public.supplier_bonifications sb
    where sb.fornecedor_id = f.id
  ) sb_agg on true;

create or replace function public.auto_block_low_score_supplier()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
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

create or replace function public.auto_calculate_delivery_penalty()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
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

create or replace function public.apply_penalty_escalation()
returns trigger
language plpgsql
set search_path = public
as $function$
DECLARE
  infraction_count INTEGER;
  escalation_record RECORD;
  supplier_id_val TEXT;
BEGIN
  SELECT supplier_id INTO supplier_id_val FROM contracts WHERE id = NEW.contract_id;
  SELECT COUNT(*) INTO infraction_count FROM contract_penalties cp JOIN contracts c ON c.id = cp.contract_id WHERE c.supplier_id = supplier_id_val AND cp.id != NEW.id;
  infraction_count := infraction_count + 1;
  SELECT * INTO escalation_record FROM penalty_escalation_config
    WHERE is_active = true AND (contract_id IS NULL OR contract_id = NEW.contract_id)
    AND infraction_count >= min_infractions AND (max_infractions IS NULL OR infraction_count <= max_infractions)
    ORDER BY contract_id NULLS LAST, level DESC LIMIT 1;
  IF FOUND THEN
    NEW.penalty_value := NEW.penalty_value * escalation_record.penalty_multiplier;
    IF escalation_record.action_type IN ('temp_block', 'permanent_block') THEN
      UPDATE fornecedores SET status = 'bloqueado', updated_at = now() WHERE id = supplier_id_val::uuid;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

comment on column public.contracts.supplier_id is null;

do $bloco$
declare v_tipo text;
begin
  select data_type into v_tipo from information_schema.columns
   where table_schema = 'public' and table_name = 'contracts' and column_name = 'supplier_id';
  if v_tipo <> 'text' then
    raise exception 'rollback 127: supplier_id continua % (esperado text)', v_tipo;
  end if;
  if exists (select 1 from pg_constraint where conname = 'contracts_supplier_id_fkey' and conrelid = 'public.contracts'::regclass) then
    raise exception 'rollback 127: FK contracts_supplier_id_fkey ainda existe';
  end if;
  perform 1 from public.supplier_compliance_summary limit 1;
end;
$bloco$;