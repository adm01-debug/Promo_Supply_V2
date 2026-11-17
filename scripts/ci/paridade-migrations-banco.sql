-- Coleta o inventario real do schema public para comparar com o que as
-- migrations declaram (scripts/ci/paridade-migrations-banco.mjs).
-- Saida: UMA linha JSON. Use com: psql "$SUPABASE_DB_URL" -tAf <este arquivo>
select json_build_object(
  'tabelas',   (select coalesce(json_agg(tablename), '[]'::json) from pg_tables where schemaname = 'public'),
  'views',     (select coalesce(json_agg(viewname), '[]'::json) from pg_views where schemaname = 'public'),
  'matviews',  (select coalesce(json_agg(matviewname), '[]'::json) from pg_matviews where schemaname = 'public'),
  'funcoes',   (select coalesce(json_agg(distinct p.proname), '[]'::json)
                  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public'),
  'indices',   (select coalesce(json_agg(indexname), '[]'::json) from pg_indexes where schemaname = 'public'),
  'triggers',  (select coalesce(json_agg(distinct t.tgname), '[]'::json)
                  from pg_trigger t
                  join pg_class c on c.oid = t.tgrelid
                  join pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and not t.tgisinternal),
  'politicas', (select coalesce(json_agg(distinct policyname), '[]'::json) from pg_policies where schemaname = 'public')
);