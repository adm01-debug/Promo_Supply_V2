
CREATE OR REPLACE FUNCTION public.scan_fk_without_cascade()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  r RECORD;
  v_alerts_created integer := 0;
  v_severity text;
  v_del_action text;
  v_upd_action text;
  v_suggested_del text;
  v_suggested_sql text;
  v_root_tables text[] := ARRAY['tenants','organizations','profiles','user_roles'];
  v_dedup_key text;
BEGIN
  FOR r IN
    SELECT
      c.conname AS constraint_name,
      cl_child.relname AS child_table,
      cl_parent.relname AS parent_table,
      ns_parent.nspname AS parent_schema,
      c.confdeltype,
      c.confupdtype,
      (SELECT string_agg(att.attname, ',' ORDER BY u.ord)
         FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord)
         JOIN pg_attribute att ON att.attrelid = c.conrelid AND att.attnum = u.attnum
      ) AS child_cols
    FROM pg_constraint c
    JOIN pg_class cl_child ON cl_child.oid = c.conrelid
    JOIN pg_namespace ns_child ON ns_child.oid = cl_child.relnamespace
    JOIN pg_class cl_parent ON cl_parent.oid = c.confrelid
    JOIN pg_namespace ns_parent ON ns_parent.oid = cl_parent.relnamespace
    WHERE c.contype = 'f'
      AND ns_child.nspname = 'public'
      AND ns_parent.nspname NOT IN ('auth','storage','realtime','vault','supabase_functions')
  LOOP
    v_del_action := CASE r.confdeltype
      WHEN 'a' THEN 'NO ACTION'
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'd' THEN 'SET DEFAULT'
      ELSE 'UNKNOWN'
    END;
    v_upd_action := CASE r.confupdtype
      WHEN 'a' THEN 'NO ACTION'
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'd' THEN 'SET DEFAULT'
      ELSE 'UNKNOWN'
    END;

    -- Classify risk
    IF r.confdeltype = 'a' AND r.parent_table = ANY(v_root_tables) THEN
      v_severity := 'HIGH';
      v_suggested_del := 'CASCADE';
    ELSIF r.confdeltype = 'a' THEN
      v_severity := 'MEDIUM';
      v_suggested_del := 'CASCADE';
    ELSIF r.confupdtype = 'a' THEN
      v_severity := 'LOW';
      v_suggested_del := v_del_action;
    ELSE
      CONTINUE; -- FK already has explicit policies
    END IF;

    v_suggested_sql := format(
      'ALTER TABLE public.%I DROP CONSTRAINT %I, ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %I.%I ON DELETE %s ON UPDATE CASCADE;',
      r.child_table, r.constraint_name, r.constraint_name,
      r.child_cols, r.parent_schema, r.parent_table, v_suggested_del
    );

    v_dedup_key := 'fk_no_cascade:' || r.child_table || ':' || r.constraint_name;

    -- Dedup 7 days
    IF EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE metadata->>'dedup_key' = v_dedup_key
        AND created_at > now() - interval '7 days'
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.system_alerts (alert_type, severity, title, message, metadata)
    VALUES (
      'fk_missing_cascade',
      v_severity,
      format('FK sem política explícita: %s.%s', r.child_table, r.constraint_name),
      format('FK %I em public.%I → %I.%I (DELETE=%s, UPDATE=%s). Risco de órfãos e bloqueio de purge.',
        r.constraint_name, r.child_table, r.parent_schema, r.parent_table, v_del_action, v_upd_action),
      jsonb_build_object(
        'dedup_key', v_dedup_key,
        'child_table', r.child_table,
        'child_columns', r.child_cols,
        'parent_schema', r.parent_schema,
        'parent_table', r.parent_table,
        'constraint_name', r.constraint_name,
        'current_delete_action', v_del_action,
        'current_update_action', v_upd_action,
        'suggested_delete_action', v_suggested_del,
        'suggested_action', v_suggested_sql
      )
    );
    v_alerts_created := v_alerts_created + 1;
  END LOOP;

  RETURN v_alerts_created;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_fk_without_cascade() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_fk_without_cascade() TO service_role;
