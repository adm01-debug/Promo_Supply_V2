-- ---------------------------------------------------------------------------
-- Etapa 127 (DB-02): contracts.supplier_id passa de text para uuid, com FK
-- para fornecedores(id).
--
-- Causa: a coluna nasceu text sem FK. O front (ContractModal, etapa 128, ja na
-- main pelo commit 2f53e103) grava o uuid do cadastro, mas nada no banco garante
-- isso: qualquer escrita por API/edge podia gravar slug ou nome livre, e o
-- contrato ficava orfao sem erro. A view supplier_compliance_summary compensava
-- com `c.supplier_id = f.id::text`, e tres funcoes comparavam com `::text`.
--
-- Estado real medido em producao antes desta migration (workflow
-- aplicar-migration-prod.yml, run 45896873786):
--   D1 contratos = 5
--   D2 casam por uuid = 5
--   D3 orfaos = 0
--   contract_penalties = 0 | contract_items = 0
--   FKs de contracts: currency, organization_id, tenant_id (nenhuma de fornecedor)
-- Logo o ALTER nao perde dado; o backfill por nome fica como rede para
-- ambientes com contrato legado em slug (medido: 0 orfaos mesmo apos casar
-- por nome, run 45897959500).
--
-- IMPORTANTE — derivacao producao x repo: as tres funcoes abaixo NAO estao no
-- formato dos arquivos de supabase/migrations. A definicao vigente em producao
-- (run 45897959500, md5 auto_block=4f05f53655fd99383ea920679e18ff0a,
-- auto_calculate=5a148b24246a6b499296bce64abeacaa,
-- apply_penalty=e1283b8636192f4aec7a5da0590999c2) contem o filtro de tenant
-- (v_tem_vinculo + user_tenants/profiles) e SET search_path que nao existem nos
-- arquivos do repo. Esta migration parte da versao de PRODUCAO e altera apenas
-- o tipo, para nao apagar aquele trabalho.
--
-- Dependencias ajustadas na mesma transacao (senao o ALTER falha ou o objeto
-- fica com SQL invalido):
--   * view public.supplier_compliance_summary (depende do cast ::text)
--   * public.auto_block_low_score_supplier()     -> c.supplier_id = NEW.id::text
--   * public.auto_calculate_delivery_penalty()   -> c.supplier_id = NEW.fornecedor_id::text
--   * public.apply_penalty_escalation()          -> variavel TEXT + ::uuid
-- get_compras_dashboard_metrics e get_compras_sla_metrics NAO usam a coluna
-- (filtram s./p./pg.fornecedor_id, que ja sao uuid) e ficam intactas.
--
-- Idempotente: cada passo verifica o estado antes de agir.
-- ---------------------------------------------------------------------------

-- 1-2) Backfill e guarda de formato, so quando a coluna ainda e' text (torna a
--      migration reaplicavel sem erro). Fora do formato uuid, casa pelo nome
--      normalizado (minusculas, sem acento e sem pontuacao) com fornecedores.
do $bloco$
declare
  v_tipo text;
  v_restantes bigint;
  v_exemplo text;
begin
  select data_type into v_tipo
    from information_schema.columns
   where table_schema = 'public' and table_name = 'contracts' and column_name = 'supplier_id';

  if v_tipo = 'text' then
    update public.contracts c
       set supplier_id = f.id::text
      from public.fornecedores f
     where c.supplier_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       and lower(regexp_replace(translate(c.supplier_name,
                 'áàâãäéèêëíìîïóòôõöúùûüç' || 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                 'aaaaaeeeeiiiiooooouuuuc' || 'AAAAAEEEEIIIIOOOOOUUUUC'), '[^A-Za-z0-9]', '', 'g'))
         = lower(regexp_replace(translate(f.razao_social,
                 'áàâãäéèêëíìîïóòôõöúùûüç' || 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                 'aaaaaeeeeiiiiooooouuuuc' || 'AAAAAEEEEIIIIOOOOOUUUUC'), '[^A-Za-z0-9]', '', 'g'));

    select count(*), min(supplier_id) into v_restantes, v_exemplo
      from public.contracts
     where supplier_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
    if v_restantes > 0 then
      raise exception 'contracts.supplier_id: % linha(s) fora do formato uuid mesmo apos casar por nome (ex.: %). Corrija o dado antes de aplicar a etapa 127.', v_restantes, v_exemplo;
    end if;
  end if;
end;
$bloco$;

-- 3) A view depende do cast: sair do caminho antes do ALTER
drop view if exists public.supplier_compliance_summary;

-- 4) Conversao de tipo (a coluna e' NOT NULL; o USING preserva o valor)
alter table public.contracts
  alter column supplier_id type uuid using supplier_id::uuid;

-- 5) Integridade: FK para o cadastro + indice para os filtros por fornecedor
alter table public.contracts
  drop constraint if exists contracts_supplier_id_fkey;
alter table public.contracts
  add constraint contracts_supplier_id_fkey
  foreign key (supplier_id) references public.fornecedores(id) on delete restrict;
create index if not exists idx_contracts_supplier_id on public.contracts(supplier_id);

-- 6) View de volta, agora comparando uuid com uuid
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
    where c.supplier_id = f.id
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

-- 7) Funcoes/gatilhos: corpo vigente em producao, so a comparacao muda de
--    texto para uuid (ver nota no cabecalho).
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
      WHERE c.supplier_id = NEW.id
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

        EXIT; -- One block is enough
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

    -- Find active contract for this supplier
    FOR v_contract IN
      SELECT c.* FROM contracts c
      WHERE c.supplier_id = NEW.fornecedor_id
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
  supplier_id_val uuid;
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
      UPDATE fornecedores SET status = 'bloqueado', updated_at = now() WHERE id = supplier_id_val;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 8) Validacao: falha a transacao se algo nao bateu
do $bloco$
declare
  v_tipo text;
  v_validada boolean;
  v_sobras bigint;
begin
  select data_type into v_tipo
    from information_schema.columns
   where table_schema = 'public' and table_name = 'contracts' and column_name = 'supplier_id';
  if v_tipo <> 'uuid' then
    raise exception 'etapa 127: contracts.supplier_id continua % (esperado uuid)', v_tipo;
  end if;

  select convalidated into v_validada
    from pg_constraint
   where conname = 'contracts_supplier_id_fkey' and conrelid = 'public.contracts'::regclass;
  if v_validada is not true then
    raise exception 'etapa 127: FK contracts_supplier_id_fkey ausente ou nao validada';
  end if;

  select count(*) into v_sobras
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('auto_block_low_score_supplier','auto_calculate_delivery_penalty','apply_penalty_escalation')
     and p.prosrc ~ 'supplier_id(_val)?\s*=\s*[^;]*::text';
  if v_sobras > 0 then
    raise exception 'etapa 127: % funcao(oes) ainda comparam supplier_id com ::text', v_sobras;
  end if;

  perform 1 from public.supplier_compliance_summary limit 1;
end;
$bloco$;

comment on column public.contracts.supplier_id is 'FK para fornecedores(id). Era text sem FK ate a etapa 127 (DB-02).';