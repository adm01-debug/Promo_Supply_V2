-- Diagnostico somente-leitura 3: tipos das colunas que a etapa 127 toca.
select 'T1_' || table_name || '.' || column_name || '=' || data_type || '(' || coalesce(character_maximum_length::text, '') || ') nulavel=' || is_nullable
  from information_schema.columns
 where table_schema = 'public'
   and ((table_name = 'fornecedores' and column_name = 'id')
     or (table_name = 'pedidos' and column_name = 'fornecedor_id')
     or (table_name = 'contracts' and column_name in ('id','supplier_id','supplier_name','tenant_id','organization_id'))
     or (table_name = 'contract_penalties' and column_name in ('contract_id','pedido_id'))
     or (table_name = 'penalty_escalation_config' and column_name in ('contract_id','is_active','min_infractions'))
     or (table_name = 'receiving_checklists' and column_name = 'fornecedor_id'))
 order by table_name, column_name;
select 'T2_dependencias_da_view=' || coalesce(string_agg(distinct c.relkind::text || ':' || c.relname, ', '), 'nenhuma')
  from pg_depend d join pg_rewrite r on r.oid = d.objid
  join pg_class c on c.oid = r.ev_class
 where d.refobjid = 'public.supplier_compliance_summary'::regclass and c.oid <> 'public.supplier_compliance_summary'::regclass;
select 'T3_indices_contracts=' || coalesce(string_agg(indexname, ', ' order by indexname), 'nenhum') from pg_indexes where schemaname='public' and tablename='contracts';
select 'T4_linhas=' || (select count(*) from contracts) || ' distintos=' || (select count(distinct supplier_id) from contracts) || ' sem_uuid=' || (select count(*) from contracts where supplier_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
select 'T5_view_grant_options=' || coalesce(string_agg(distinct relname || ':' || reloptions::text, ' ; '), 'sem opcoes')
  from pg_class where oid = 'public.supplier_compliance_summary'::regclass;