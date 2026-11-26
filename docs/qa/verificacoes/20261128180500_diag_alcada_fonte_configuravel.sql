-- Diagnostico somente-leitura da etapa 114, rodada 2: a fonte configuravel da alcada
-- e' de fato editavel pela tela? Nao altera nada.
select 'B1_acl_approval_rules=' || coalesce(relacl::text, 'null') from pg_class where oid='public.approval_rules'::regclass;
select 'B2_acl_cost_centers=' || coalesce(relacl::text, 'null') from pg_class where oid='public.cost_centers'::regclass;
select 'B3_priv_rules=' || 'sel_auth=' || has_table_privilege('authenticated','public.approval_rules','SELECT')
  || ' ins_auth=' || has_table_privilege('authenticated','public.approval_rules','INSERT')
  || ' upd_auth=' || has_table_privilege('authenticated','public.approval_rules','UPDATE')
  || ' sel_anon=' || has_table_privilege('anon','public.approval_rules','SELECT')
  || ' sel_service=' || has_table_privilege('service_role','public.approval_rules','SELECT');
select 'B4_priv_centers=' || 'sel_auth=' || has_table_privilege('authenticated','public.cost_centers','SELECT')
  || ' ins_auth=' || has_table_privilege('authenticated','public.cost_centers','INSERT')
  || ' upd_auth=' || has_table_privilege('authenticated','public.cost_centers','UPDATE');
select 'B5_policies_rules=' || coalesce(string_agg(policyname || ':' || cmd || ':' || coalesce(roles::text,'-'), ' ;; '), 'nenhuma')
  from pg_policies where schemaname='public' and tablename='approval_rules';
select 'B6_policies_centers=' || coalesce(string_agg(policyname || ':' || cmd, ' ;; '), 'nenhuma')
  from pg_policies where schemaname='public' and tablename='cost_centers';
select 'B7_rules_total=' || (select count(*) from public.approval_rules) || ' ativos=' || (select count(*) from public.approval_rules where ativo);
select 'B8_solic_com_centro=' || count(*) || ' de ' || (select count(*) from public.solicitacoes) || ' | valor_estimado_nulo=' || count(*) filter (where valor_estimado is null)
  from public.solicitacoes where cost_center_id is not null;
select 'B9_impacto_hoje=' || coalesce(string_agg(descricao, ' ;; '), 'vazio')
  from (
    select cc.code || ': limite=' || cc.approval_threshold || ' solicitacoes_do_centro=' || (select count(*) from public.solicitacoes s where s.cost_center_id = cc.id)
      || ' que_passariam_a_auto_aprovar=' || (select count(*) from public.solicitacoes s where s.cost_center_id = cc.id and s.valor_estimado is not null and s.valor_estimado < cc.approval_threshold and s.valor_estimado >= 1000) as descricao
    from public.cost_centers cc order by cc.code
  ) t;
select 'B10_fila_fantasma=' || count(*) from public.approval_workflows w join public.solicitacoes s on s.id = w.solicitacao_id
 where w.status = 'pending' and s.status not in ('pendente','em_cotacao');
select 'B11_workflows=' || coalesce(string_agg(status || ':' || (select count(*) from public.approval_workflows w2 where w2.status = w.status)::text, ', '), 'vazio')
  from (select distinct status from public.approval_workflows) w;
select 'B12_sem_centro_valor=' || coalesce(string_agg(to_jsonb(t)::text, ' ;; '), 'vazio')
  from (select numero, valor_estimado, status, cost_center_id, departamento, centro_custo from public.solicitacoes order by created_at desc limit 8) t;
select 'B13_departamentos=' || coalesce(string_agg(distinct departamento, ', '), 'vazio') from public.solicitacoes;
select 'B14_trg_lista=' || coalesce(string_agg(t.tgname || ':' || p.proname, ', ' order by t.tgname), 'nenhum')
  from pg_trigger t join pg_proc p on p.oid = t.tgfoid where t.tgrelid='public.solicitacoes'::regclass and not t.tgisinternal;
select 'B15_def_auto_approve_md5=' || md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='auto_approve_low_value_solicitacao';