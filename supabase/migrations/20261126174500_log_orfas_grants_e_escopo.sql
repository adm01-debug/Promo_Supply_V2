-- DB-08 / etapa 146: as tabelas de log orfas do particionamento abandonado ficaram com
-- o endurecimento pela metade - a tabela-mae foi travada, as irmas nao.
--
-- audit_logs recebeu append-only (20261117210000_audit_logs_append_only_hash_encadeado.sql):
-- anon e authenticated tem apenas SELECT e INSERT. audit_logs_202605..202609,
-- audit_logs_legacy_20260712, telemetry_logs_202605..202609 e
-- telemetry_logs_legacy_20260712 continuam concedendo DELETE, UPDATE e TRUNCATE a anon e
-- authenticated, e a policy de leitura delas ("admin_read_partition", criada em
-- 20260713104708_ab7115f1) e so has_role(auth.uid(),'admin') - sem tenant_in_my_group,
-- diferente de "tenant_isolation_audit_logs" na tabela-mae.
--
-- Escopo desta migration: fechar os grants e o escopo de leitura.
-- NAO esta no escopo, de proposito: dropar ou esvaziar as tabelas que tem dado real
-- (telemetry_logs_202605 e telemetry_logs_legacy_20260712, ~1130 linhas de telemetria
-- pessoal) e incluir as irmas dentro de apply_lgpd_retention. O primeiro e' decisao de
-- negocio sobre dado; o segundo criaria um prazo de retencao concorrente, que e'
-- exatamente o defeito que 20261117230000_retencao_fonte_unica.sql corrigiu.
--
-- Reversao: supabase/rollbacks/20261126174500_revert_log_orfas_grants.sql

BEGIN;

DO $$
DECLARE
  t       text;
  tabelas text[] := ARRAY[
    'audit_logs_202605','audit_logs_202606','audit_logs_202607','audit_logs_202608','audit_logs_202609',
    'audit_logs_legacy_20260712',
    'telemetry_logs_202605','telemetry_logs_202606','telemetry_logs_202607','telemetry_logs_202608','telemetry_logs_202609',
    'telemetry_logs_legacy_20260712'
  ];
  tem_tenant boolean;
  ausentes   text[] := '{}';
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      ausentes := ausentes || t;
      CONTINUE;
    END IF;

    -- 1) fecha escrita destrutiva para os papeis de cliente, espelhando a tabela-mae
    EXECUTE format('REVOKE DELETE, UPDATE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT ON TABLE public.%I TO anon, authenticated', t);

    -- 2) leitura por empresa: mesma regra da tabela-mae, so onde existe tenant_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
    ) INTO tem_tenant;

    IF tem_tenant THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "admin_read_partition" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "admin_read_partition" ON public.%I FOR SELECT TO authenticated '
        'USING (public.has_role(auth.uid(), ''admin''::app_role) AND public.tenant_in_my_group(tenant_id))',
        t
      );
      EXECUTE format('DROP POLICY IF EXISTS "service_role_all_partition" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "service_role_all_partition" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        t
      );
    ELSE
      RAISE NOTICE 'etapa 146: % sem tenant_id - grants fechados, policy de leitura mantida', t;
    END IF;

    RAISE NOTICE 'etapa 146: % endurecida', t;
  END LOOP;

  IF array_length(ausentes, 1) IS NOT NULL THEN
    RAISE NOTICE 'etapa 146: tabelas ausentes (nada a fazer): %', array_to_string(ausentes, ', ');
  END IF;
END
$$;

COMMIT;