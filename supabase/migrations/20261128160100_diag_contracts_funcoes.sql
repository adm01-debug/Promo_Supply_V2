-- Diagnostico somente-leitura 2: como as funcoes de producao usam supplier_id.
select 'F1_' || p.proname || '=' || string_agg(trim(l), ' // ' order by l)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral regexp_split_to_table(p.prosrc, E'\n') as l
 where n.nspname = 'public' and p.prosrc like '%supplier_id%' and l like '%supplier_id%'
 group by p.proname;
select 'F2_viewdef=' || replace(pg_get_viewdef('public.supplier_compliance_summary'::regclass, true), E'\n', ' ');
select 'F3_view_owner_e_grants=' || (select pg_get_userbyid(relowner) from pg_class where oid='public.supplier_compliance_summary'::regclass)
  || ' | ' || coalesce((select string_agg(grantee || ':' || privilege_type, ', ' order by grantee, privilege_type)
     from information_schema.role_table_grants where table_schema='public' and table_name='supplier_compliance_summary'), 'nenhum');
select 'F4_funcoes_nome=' || coalesce(string_agg(p.oid || ':' || p.proname || '(' || pg_get_function_arguments(p.oid) || ')', ' ;; ' order by p.proname), 'nenhuma')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname='public' and p.proname in ('apply_penalty_escalation','auto_calculate_delivery_penalty','auto_block_low_score_supplier');
select 'F5_triggers_contracts=' || coalesce(string_agg(t.tgname, ', '), 'nenhum') from pg_trigger t where t.tgrelid='public.contracts'::regclass and not t.tgisinternal;
select 'F6_rowsec_contracts=' || relrowsecurity || ' forcada=' || relforcerowsecurity from pg_class where oid='public.contracts'::regclass;
select 'F7_policies_contracts=' || coalesce(string_agg(policyname || '(' || cmd || ')', ', ' order by policyname), 'nenhuma') from pg_policies where schemaname='public' and tablename='contracts';
select 'F8_gatilho_fornecedor_avaliacao=' || coalesce(string_agg(tgname, ', '), 'nenhum') from pg_trigger where tgrelid='public.fornecedores'::regclass and not tgisinternal;