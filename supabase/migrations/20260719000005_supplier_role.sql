-- F-044: Add 'supplier' to app_role enum and create RLS policies for supplier portal.
-- The portal-fornecedor route now requires requiredRole=['supplier','admin'] on the
-- client side; this migration aligns the database role enum and restricts access at
-- the data layer too.

BEGIN;

-- ── 1. Extend the app_role enum ──────────────────────────────────────────────
-- Only add if the enum exists and the value is not already present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'app_role' AND e.enumlabel = 'supplier'
    ) THEN
      ALTER TYPE app_role ADD VALUE 'supplier';
    END IF;
  END IF;
END $$;

-- ── 2. Helper: is current user a supplier? ───────────────────────────────────
-- Used in RLS policies below to avoid repeated sub-queries.
CREATE OR REPLACE FUNCTION auth.is_supplier()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'supplier'
  );
$$;

-- ── 3. Fornecedores table: suppliers can view their own record ───────────────
-- Only applies when the table has a campo user_id or cnpj that links to auth.users.
-- We create a SELECT policy; suppliers cannot INSERT/UPDATE/DELETE buyer data.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fornecedores') THEN
    -- Drop existing over-permissive supplier policies if any
    DROP POLICY IF EXISTS supplier_select_own ON fornecedores;

    -- Suppliers can see only their own record; buyers/admin see all (via other policies)
    EXECUTE $policy$
      CREATE POLICY supplier_select_own ON fornecedores
        FOR SELECT
        USING (
          auth.is_supplier()
          AND (
            user_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM profiles p
              WHERE p.id = auth.uid()
                AND p.organization_id = fornecedores.organization_id
            )
          )
        )
    $policy$;
  END IF;
END $$;

-- ── 4. Cotacoes / RFx: suppliers can view quotes addressed to them ────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cotacoes') THEN
    DROP POLICY IF EXISTS supplier_select_cotacoes ON cotacoes;

    EXECUTE $policy$
      CREATE POLICY supplier_select_cotacoes ON cotacoes
        FOR SELECT
        USING (
          auth.is_supplier()
          AND fornecedor_id IN (
            SELECT id FROM fornecedores WHERE user_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

-- ── 5. Ensure user_roles table grants supplier role assignment ────────────────
-- Admins can assign the supplier role via the existing user_roles policies.
-- No change needed here beyond the enum extension above.

COMMIT;
