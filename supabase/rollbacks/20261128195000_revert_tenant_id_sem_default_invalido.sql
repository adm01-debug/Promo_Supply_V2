-- Reversao da migration 20261128195000_tenant_id_sem_default_invalido.sql.
-- Restaura o default '00000000-0000-0000-0000-000000000000' exatamente nas colunas marcadas pela migration
-- (comment 'rollback:default_tenant_zero:20261128195000'), sem adivinhar por "coluna sem default" - isso pegaria
-- tabela que nunca teve default zero. Os gatilhos a_fill_tenant_id criados a mais NAO sao removidos de proposito:
-- removê-los apagaria tambem os que ja existiam antes da migration, e um gatilho a mais apenas preenche tenant_id
-- com o tenant do usuario logado (mesmo comportamento das 37 tabelas que ja o tinham).

DO $revert$
DECLARE
  r record;
  v_n integer := 0;
BEGIN
  FOR r IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema
       AND t.table_name = c.table_name
       AND t.table_type = 'BASE TABLE'
     WHERE c.table_schema = 'public'
       AND c.column_name = 'tenant_id'
       AND col_description(
             (quote_ident(c.table_schema) || '.' || quote_ident(c.table_name))::regclass,
             c.ordinal_position
           ) = 'rollback:default_tenant_zero:20261128195000'
     ORDER BY c.table_name
  LOOP
    EXECUTE format(
      'alter table public.%I alter column tenant_id set default ''00000000-0000-0000-0000-000000000000''::uuid',
      r.table_name
    );
    EXECUTE format('comment on column public.%I.tenant_id is null', r.table_name);
    v_n := v_n + 1;
  END LOOP;

  RAISE NOTICE 'tenant_id: default do tenant zero restaurado em % coluna(s)', v_n;
END $revert$;