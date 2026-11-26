-- Diagnostico somente-leitura 4: definicao vigente em producao das funcoes que a etapa 127 toca.
select 'G_meta_' || p.proname || '=' || md5(pg_get_functiondef(p.oid)) || ' len=' || length(pg_get_functiondef(p.oid))
     || ' secdef=' || p.prosecdef || ' config=' || coalesce(p.proconfig::text, 'padrao')
     || ' acl=' || coalesce(p.proacl::text, 'padrao')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('apply_penalty_escalation','auto_block_low_score_supplier','auto_calculate_delivery_penalty')
 order by p.proname;
select 'H_def_' || p.proname || '=' || replace(replace(pg_get_functiondef(p.oid), E'\n', ' ~ '), E'\t', ' ')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('apply_penalty_escalation','auto_block_low_score_supplier','auto_calculate_delivery_penalty')
 order by p.proname;
select 'I_view_reloptions=' || coalesce((select reloptions::text from pg_class where oid = 'public.supplier_compliance_summary'::regclass), 'nenhuma');
select 'J_dep_view=' || coalesce(string_agg(distinct c.relkind::text || ':' || c.relname, ', '), 'nenhuma')
  from pg_depend d
  join pg_rewrite r on r.oid = d.objid
  join pg_class c on c.oid = r.ev_class
 where d.refobjid = 'public.supplier_compliance_summary'::regclass
   and c.oid <> 'public.supplier_compliance_summary'::regclass;
select 'K_orfãos_apos_nome=' || (select count(*) from contracts c
         where c.supplier_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
           and not exists (select 1 from fornecedores f
                            where lower(regexp_replace(f.razao_social, '[^A-Za-z0-9]', '', 'g')) = lower(regexp_replace(c.supplier_name, '[^A-Za-z0-9]', '', 'g'))));