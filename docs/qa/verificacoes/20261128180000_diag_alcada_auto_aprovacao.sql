-- Diagnostico somente-leitura da etapa 114 (NEG-14): onde mora hoje a alcada de
-- auto-aprovacao e o que a tela ja permite configurar. Nao altera nada.
select 'A1_def_auto_approve=' || pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.proname='auto_approve_low_value_solicitacao';
select 'A2_def_guard=' || pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.proname='guard_solicitacao_escrita';
select 'A3_colunas_approval_rules=' || coalesce(string_agg(column_name || ':' || data_type || ':' || is_nullable, ', ' order by ordinal_position), 'tabela ausente')
  from information_schema.columns where table_schema='public' and table_name='approval_rules';
select 'A4_linhas_approval_rules=' || coalesce(string_agg(to_jsonb(t)::text, ' ;; '), 'vazio') from public.approval_rules t;
select 'A5_colunas_cost_centers=' || coalesce(string_agg(column_name || ':' || data_type || ':' || is_nullable, ', ' order by ordinal_position), 'tabela ausente')
  from information_schema.columns where table_schema='public' and table_name='cost_centers';
select 'A6_cost_centers=' || coalesce(string_agg(to_jsonb(t)::text, ' ;; '), 'vazio') from public.cost_centers t;
select 'A7_triggers_solicitacoes=' || coalesce(string_agg(t.tgname || ':' || p.proname || ':tipo' || t.tgtype::text, ', ' order by t.tgname), 'nenhum')
  from pg_trigger t join pg_proc p on p.oid = t.tgfoid
 where t.tgrelid = 'public.solicitacoes'::regclass and not t.tgisinternal;
select 'A8_solicitacoes_menor_1000=' || count(*) || ' de ' || (select count(*) from public.solicitacoes) || ' | status=' || coalesce(string_agg(distinct status, ', '), 'vazio')
  from public.solicitacoes where valor_estimado < 1000;
select 'A9_tabelas_config=' || coalesce(string_agg(tablename, ', '), 'nenhuma') from pg_tables
 where schemaname='public' and (tablename like '%config%' or tablename like '%setting%' or tablename like '%parametro%' or tablename like '%alcada%');
select 'A10_check_solicitacoes=' || coalesce(string_agg(conname || '=' || pg_get_constraintdef(oid), ' ;; '), 'nenhum')
  from pg_constraint where conrelid='public.solicitacoes'::regclass and contype='c';
select 'A11_colunas_solicitacoes=' || coalesce(string_agg(column_name || ':' || data_type || ':' || is_nullable, ', ' order by ordinal_position), 'ausente')
  from information_schema.columns where table_schema='public' and table_name='solicitacoes';
select 'A12_rls_solicitacoes=' || (select relrowsecurity::text from pg_class where oid='public.solicitacoes'::regclass) || ' policies=' || coalesce((select string_agg(policyname || ':' || cmd, ', ' order by policyname) from pg_policies where schemaname='public' and tablename='solicitacoes'), 'nenhuma');
select 'A13_grants_rules_centers=' || coalesce(string_agg(table_name || ':' || grantee || ':' || privilege_type, ', ' order by table_name, grantee, privilege_type), 'nenhum')
  from information_schema.role_table_grants where table_schema='public' and table_name in ('approval_rules','cost_centers');