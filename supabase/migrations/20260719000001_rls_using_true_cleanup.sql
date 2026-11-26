-- F-032: Clean up remaining permissive USING(true) policies on tenant-scoped tables.
-- Reference tables (currencies, exchange_rates, unspsc_codes, cost_centers, produtos)
-- intentionally keep USING(true) for authenticated users — they are shared catalogs.
-- Only tenant-scoped tables with business data are tightened here.

BEGIN;

-- ============================================================================
-- 1. solicitacoes — already dropped in 20260521142029, but re-guard in case
--    earlier migrations reapply. Drop any lingering permissive policy.
-- ============================================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.solicitacoes;

-- ============================================================================
-- 2. 20260108121940 migration: table in that migration that got USING(true).
--    Drop and recreate with tenant scope (idempotent with IF EXISTS).
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
  policies TEXT[] := ARRAY[
    'Authenticated users can manage items',
    'Allow all for authenticated'
  ];
  pol TEXT;
  tbls TEXT[] := ARRAY[
    'pedidos',
    'pedido_itens',
    'pedido_aprovacoes',
    'rfq_headers',
    'rfq_line_items',
    'rfq_responses'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    FOREACH pol IN ARRAY policies LOOP
      IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl AND policyname = pol
          AND (qual = 'true' OR qual IS NULL)
      ) THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
      END IF;
    END LOOP;
    -- Re-create tenant-scoped policy only if table has tenant_id column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl AND policyname = 'tenant_isolation'
    ) THEN
      EXECUTE format(
        $POL$
          CREATE POLICY "tenant_isolation" ON public.%I
            FOR ALL TO authenticated
            USING (tenant_id = public.current_tenant_id())
            WITH CHECK (tenant_id = public.current_tenant_id())
        $POL$,
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 3. 20260314200210: Drop remaining USING(true) policy on the table from that
--    migration (if it exists and still has the permissive policy).
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN (
        'Authenticated users can view their notifications',
        'Authenticated users can manage their notifications'
      )
      AND qual = 'true'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can view their notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Authenticated users can manage their notifications" ON public.notifications;
    -- Recreate with user-scoped policy
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'user_id'
    ) THEN
      CREATE POLICY "Users can manage own notifications"
        ON public.notifications FOR ALL TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 4. 20260517131213: Drop FOR ALL USING(true) if still present
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'Allow all for authenticated on integration_outbox'
  ) THEN
    DROP POLICY IF EXISTS "Allow all for authenticated on integration_outbox" ON public.integration_outbox;
  END IF;
END $$;

COMMIT;
