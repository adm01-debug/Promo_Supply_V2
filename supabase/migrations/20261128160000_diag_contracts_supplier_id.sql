-- Diagnostico somente-leitura: estado real de public.contracts.supplier_id.
-- Nao altera nada; existe apenas para decidir o backfill da etapa 127.
select 'D1_total_contratos=' || count(*) from public.contracts;
select 'D2_casam_por_uuid=' || count(*) from public.contracts c join public.fornecedores f on f.id::text = c.supplier_id;
select 'D3_orfaos=' || count(*) from public.contracts c where not exists (select 1 from public.fornecedores f where f.id::text = c.supplier_id);
select 'D3b_parecem_uuid=' || count(*) from public.contracts where supplier_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
select 'D4_orfaos_com_nome_casavel=' || count(*) from public.contracts c
 where not exists (select 1 from public.fornecedores f2 where f2.id::text = c.supplier_id)
   and coalesce(c.supplier_name,'') <> ''
   and exists (
     select 1 from public.fornecedores f
      where regexp_replace(translate(upper(coalesce(f.razao_social,'') || ' ' || coalesce(f.nome_fantasia,'')), 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC'), '[^A-Z0-9]', '', 'g')
         like '%' || regexp_replace(translate(upper(c.supplier_name), 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC'), '[^A-Z0-9]', '', 'g') || '%');
select 'D5_amostra_orfaos=' || coalesce(string_agg(supplier_id || ' ~ ' || coalesce(supplier_name,'-') || ' => ' || coalesce(match_razao, 'SEM-MATCH'), ' ;; '), 'vazio')
  from (
    select c.supplier_id, c.supplier_name,
      (select f.razao_social from public.fornecedores f
        where regexp_replace(translate(upper(coalesce(f.razao_social,'') || ' ' || coalesce(f.nome_fantasia,'')), 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC'), '[^A-Z0-9]', '', 'g')
           like '%' || regexp_replace(translate(upper(c.supplier_name), 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC'), '[^A-Z0-9]', '', 'g') || '%'
        limit 1) as match_razao
      from public.contracts c
     where not exists (select 1 from public.fornecedores f2 where f2.id::text = c.supplier_id)
     order by c.supplier_id
     limit 15
  ) t;
select 'D6_colunas_contracts=' || string_agg(column_name || ':' || data_type || ':' || is_nullable, ', ' order by ordinal_position)
  from information_schema.columns where table_schema='public' and table_name='contracts';
select 'D7_fks_contracts=' || coalesce(string_agg(conname || '->' || confrelid::regclass::text, ', '), 'nenhuma')
  from pg_constraint where conrelid = 'public.contracts'::regclass and contype = 'f';
select 'D8_penalties=' || (select count(*) from public.contract_penalties) || ' D8b_itens=' || (select count(*) from public.contract_items);
select 'D9_leitores_supplier_id=' || coalesce(string_agg(p.proname, ', '), 'nenhum')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosrc like '%supplier_id%';
select 'D10_views_supplier_id=' || coalesce(string_agg(viewname, ', '), 'nenhuma')
  from pg_views where schemaname='public' and definition like '%supplier_id%';