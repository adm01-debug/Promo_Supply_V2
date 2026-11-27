-- security(rls): tabelas de arquivo de auditoria/telemetria passam a filtrar empresa (achado RLS-06, etapa 066).
--
-- Causa: audit_logs_2026xx / *_legacy_20260712 / telemetry_logs* tem coluna tenant_id, mas a unica policy
-- de leitura e "has_role(auth.uid(),'admin')" (admin_read_partition / "Admins can view telemetry logs"),
-- sem nenhum filtro de empresa, e nenhuma policy RESTRICTIVE. Esses objetos NAO sao particoes de
-- audit_logs/telemetry_logs (tipo = table e numero de colunas diferente), entao nao herdam a policy
-- tenant_isolation_audit_logs: qualquer admin de qualquer empresa lia o arquivo das outras.
--
-- Correcao: mesma policy RESTRICTIVE do padrao de 20261112170347, aplicada so nas tabelas de arquivo e
-- mantendo admin_read_partition. O predicado aceita as duas convencoes que a coluna tenant_id ja teve
-- neste banco (tenants.id e organizations.id), porque o dado arquivado e anterior a consolidacao do
-- modelo de tenant; em nenhuma das duas ele libera linha de outra empresa.
--
-- Fora do escopo: service_role ignora RLS (o job de arquivamento continua escrevendo igual);
-- login_attempts, security_logs, geo_access_logs e rate_limit_logs nao tem tenant_id.
--
-- Reversao: supabase/rollbacks/20261128180000_revert_rls_logs_arquivo_tenant.sql (nao aplicada automaticamente).

-- Guarda: se alguma tabela esperada nao existir mais, aborta antes de mexer em qualquer policy.
DO $guarda$
DECLARE
  v_tabela text;
  v_faltando text[] := ARRAY[]::text[];
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY[
    'audit_logs_202605', 'audit_logs_202606', 'audit_logs_202607', 'audit_logs_202608', 'audit_logs_202609', 'audit_logs_legacy_20260712', 'telemetry_logs', 'telemetry_logs_202605', 'telemetry_logs_202606', 'telemetry_logs_202607', 'telemetry_logs_202608', 'telemetry_logs_202609', 'telemetry_logs_legacy_20260712'
  ] LOOP
    IF to_regclass('public.' || v_tabela) IS NULL THEN
      v_faltando := v_faltando || v_tabela;
    END IF;
  END LOOP;
  IF array_length(v_faltando, 1) > 0 THEN
    RAISE EXCEPTION 'tabelas esperadas nao existem: %', array_to_string(v_faltando, ', ');
  END IF;
END $guarda$;

DROP POLICY IF EXISTS tenant_isolation_audit_logs_202605 ON public.audit_logs_202605;
CREATE POLICY tenant_isolation_audit_logs_202605 ON public.audit_logs_202605 AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS tenant_isolation_audit_logs_202606 ON public.audit_logs_202606;
CREATE POLICY tenant_isolation_audit_logs_202606 ON public.audit_logs_202606 AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS tenant_isolation_audit_logs_202607 ON public.audit_logs_202607;
CREATE POLICY tenant_isolation_audit_logs_202607 ON public.audit_logs_202607 AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS tenant_isolation_audit_logs_202608 ON public.audit_logs_202608;
CREATE POLICY tenant_isolation_audit_logs_202608 ON public.audit_logs_202608 AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS tenant_isolation_audit_logs_202609 ON public.audit_logs_202609;
CREATE POLICY tenant_isolation_audit_logs_202609 ON public.audit_logs_202609 AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS tenant_isolation_audit_logs_legacy_20260712 ON public.audit_logs_legacy_20260712;
CREATE POLICY tenant_isolation_audit_logs_legacy_20260712 ON public.audit_logs_legacy_20260712 AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS tenant_isolation_telemetry_logs ON public.telemetry_logs;
CREATE POLICY tenant_isolation_telemetry_logs ON public.telemetry_logs AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS tenant_isolation_telemetry_logs_202605 ON public.telemetry_logs_202605;
CREATE POLICY tenant_isolation_telemetry_logs_202605 ON public.telemetry_logs_202605 AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS tenant_isolation_telemetry_logs_202606 ON public.telemetry_logs_202606;
CREATE POLICY tenant_isolation_telemetry_logs_202606 ON public.telemetry_logs_202606 AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS tenant_isolation_telemetry_logs_202607 ON public.telemetry_logs_202607;
CREATE POLICY tenant_isolation_telemetry_logs_202607 ON public.telemetry_logs_202607 AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS tenant_isolation_telemetry_logs_202608 ON public.telemetry_logs_202608;
CREATE POLICY tenant_isolation_telemetry_logs_202608 ON public.telemetry_logs_202608 AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS tenant_isolation_telemetry_logs_202609 ON public.telemetry_logs_202609;
CREATE POLICY tenant_isolation_telemetry_logs_202609 ON public.telemetry_logs_202609 AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

DROP POLICY IF EXISTS tenant_isolation_telemetry_logs_legacy_20260712 ON public.telemetry_logs_legacy_20260712;
CREATE POLICY tenant_isolation_telemetry_logs_legacy_20260712 ON public.telemetry_logs_legacy_20260712 AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id())
  WITH CHECK (public.tenant_in_my_group(tenant_id) OR tenant_id = public.get_user_grupo_id());

-- Prova: as 13 policies existem como RESTRICTIVE com USING e WITH CHECK amarrados a empresa.
DO $prova$
DECLARE
  v_tabela text;
  v_total int := 0;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY[
    'audit_logs_202605', 'audit_logs_202606', 'audit_logs_202607', 'audit_logs_202608', 'audit_logs_202609', 'audit_logs_legacy_20260712', 'telemetry_logs', 'telemetry_logs_202605', 'telemetry_logs_202606', 'telemetry_logs_202607', 'telemetry_logs_202608', 'telemetry_logs_202609', 'telemetry_logs_legacy_20260712'
  ] LOOP
    v_total := v_total + 1;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = v_tabela
        AND p.policyname = 'tenant_isolation_' || v_tabela
        AND p.permissive = 'RESTRICTIVE'
        AND p.qual LIKE '%tenant_in_my_group%'
        AND p.with_check LIKE '%tenant_in_my_group%'
    ) THEN
      RAISE EXCEPTION 'tabela % continua sem policy RESTRICTIVE de empresa', v_tabela;
    END IF;
  END LOOP;
  IF v_total <> 13 THEN
    RAISE EXCEPTION 'prova inconsistente: % tabelas verificadas', v_total;
  END IF;
END $prova$;
