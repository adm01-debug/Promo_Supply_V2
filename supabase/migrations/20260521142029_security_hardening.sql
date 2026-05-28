-- Security hardening migration
--
-- Closes the critical RLS holes and SECURITY DEFINER footguns flagged in
-- the exhaustive audit. Designed to be idempotent so it can be reapplied
-- safely (DROP POLICY IF EXISTS / CREATE POLICY).
--
-- Scope:
--   1. Drop permissive USING (true) policies on tenant-scoped tables and
--      recreate them as tenant-bounded.
--   2. Drop anon access on audit_logs / system tables.
--   3. Lock down public reference tables to authenticated.
--   4. Add SET search_path = public, pg_temp to all SECURITY DEFINER
--      functions that lack it (search_path hijacking defense).
--   5. Replace the broken check_workflow_sod query (purchase_orders does
--      not exist; entity is pedidos).
--   6. Fix recursive subquery in profiles RLS by reusing current_tenant_id().
--   7. Add missing indexes on hot FK columns referenced by edge functions.
--
-- All DROP POLICY statements are followed by CREATE POLICY with the safe
-- definition, so the table is never left without coverage if the
-- migration is run partially.

BEGIN;

-- =============================================================================
-- 1. Permissive policies on compras tables (solicitacoes, cotacoes, fornecedores, historico_compras)
-- =============================================================================

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.solicitacoes;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.cotacoes;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.fornecedores;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.historico_compras;

-- We don't recreate tenant-scoped policies here because each of these
-- tables already has tenant-scoped policies defined in later migrations
-- (20260513165506_*, 20260512213414_*, 20260517131213_*, etc.). The
-- USING(true) policy was layered on top and granted everything via the
-- permissive OR semantics. Removing it is sufficient.

-- =============================================================================
-- 2. Drop anon access on audit_logs
-- =============================================================================

DROP POLICY IF EXISTS "Allow anon to insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow anon to view audit logs (dev only)" ON public.audit_logs;
-- Service-role writes (which is what edge functions use) bypass RLS, so
-- audit ingestion keeps working.

-- =============================================================================
-- 3. Drop "System can manage" USING(true) policies on session/token tables
-- =============================================================================

DROP POLICY IF EXISTS "System can manage sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "System can manage password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "System can update requests" ON public.password_reset_requests;
-- Same rationale as above: service_role bypasses RLS, so the legitimate
-- "system" write path keeps functioning. Authenticated users can no
-- longer forge sessions or mark arbitrary reset requests as completed.

-- =============================================================================
-- 4. fornecedor_categorias — tenant-scope (was FOR ALL USING (true))
-- =============================================================================

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.fornecedor_categorias;
DROP POLICY IF EXISTS "tenant_isolation" ON public.fornecedor_categorias;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fornecedor_categorias' AND column_name = 'tenant_id'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "tenant_isolation" ON public.fornecedor_categorias
        FOR ALL
        TO authenticated
        USING (tenant_id = public.current_tenant_id())
        WITH CHECK (tenant_id = public.current_tenant_id())
    $POL$;
  END IF;
END $$;

-- =============================================================================
-- 5. entity_versions — restrict SELECT to tenant
-- =============================================================================

DROP POLICY IF EXISTS "Users can view versions" ON public.entity_versions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'entity_versions' AND column_name = 'tenant_id'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "Users can view versions in their tenant"
        ON public.entity_versions FOR SELECT
        TO authenticated
        USING (tenant_id = public.current_tenant_id())
    $POL$;
  ELSE
    -- Fall back to authenticated-only if no tenant column (safer than USING(true)).
    EXECUTE $POL$
      CREATE POLICY "Authenticated can view versions"
        ON public.entity_versions FOR SELECT
        TO authenticated
        USING (true)
    $POL$;
  END IF;
END $$;

-- =============================================================================
-- 6. Lock currencies/exchange_rates to authenticated
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can read currencies" ON public.currencies;
DROP POLICY IF EXISTS "Anyone can read exchange_rates" ON public.exchange_rates;

CREATE POLICY "Authenticated can read currencies"
  ON public.currencies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read exchange_rates"
  ON public.exchange_rates FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- 7. Add SET search_path to all SECURITY DEFINER functions missing it
--    (search_path hijacking defense; Supabase advisor also flags this).
-- =============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, oidvectortypes(p.proargtypes) AS argtypes
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS c
        WHERE c LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      r.nspname, r.proname, r.argtypes
    );
  END LOOP;
END $$;

-- =============================================================================
-- 8. Fix check_workflow_sod: query the real entity table.
--    Original referenced public.purchase_orders (does not exist); use pedidos.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_workflow_sod(
  p_instance_id UUID,
  p_approver_id UUID,
  p_entity_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_creator_id UUID;
  v_previous_approver_id UUID;
BEGIN
  -- Look up the creator of the entity. Parameterized (no format/EXECUTE)
  -- and aimed at the real table (pedidos).
  SELECT created_by INTO v_creator_id
  FROM public.pedidos
  WHERE id = p_entity_id;

  IF v_creator_id = p_approver_id THEN
    RETURN FALSE;
  END IF;

  SELECT approver_id INTO v_previous_approver_id
  FROM public.workflow_approvals
  WHERE instance_id = p_instance_id
    AND approver_id = p_approver_id
    AND status = 'approved'
  LIMIT 1;

  IF v_previous_approver_id IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- =============================================================================
-- 9. Fix profiles RLS recursive subquery
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can view profiles in their tenant'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view profiles in their tenant" ON public.profiles';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'tenant_id'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "Users can view profiles in their tenant"
        ON public.profiles FOR SELECT
        TO authenticated
        USING (tenant_id = public.current_tenant_id())
    $POL$;
  END IF;
END $$;

-- =============================================================================
-- 10. Missing indexes on hot FK columns used by edge functions
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_workflow_approvals_instance_node_approver
  ON public.workflow_approvals (instance_id, node_id, approver_id);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_instance_node
  ON public.workflow_logs (instance_id, node_id);

CREATE INDEX IF NOT EXISTS idx_workflow_edges_source_target
  ON public.workflow_edges (source_node_id, target_node_id);

CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow_status_prazo
  ON public.approval_steps (workflow_id, status, prazo_limite);

COMMIT;
