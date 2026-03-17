-- Fix all remaining security findings in one migration

-- 1. contract_documents: restrict SELECT to admin/coordinator/finance
DROP POLICY IF EXISTS "Authenticated users can view contract documents" ON public.contract_documents;
CREATE POLICY "Role-restricted contract documents select" ON public.contract_documents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance'));

-- 2. approval_rules: restrict SELECT to admin/coordinator
DROP POLICY IF EXISTS "Authenticated users can view approval rules" ON public.approval_rules;
DO $$ BEGIN
  EXECUTE (SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.approval_rules', policyname), '; ') FROM pg_policies WHERE tablename='approval_rules' AND cmd='SELECT');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY "Role-restricted approval rules select" ON public.approval_rules
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));

-- 3. supplier_qualification_scores: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view qualification scores" ON public.supplier_qualification_scores;
DO $$ BEGIN
  EXECUTE (SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.supplier_qualification_scores', policyname), '; ') FROM pg_policies WHERE tablename='supplier_qualification_scores' AND cmd='SELECT');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY "Role-restricted qualification scores select" ON public.supplier_qualification_scores
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer') OR public.has_role(auth.uid(), 'finance'));

-- 4. receiving_checklists: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view checklists" ON public.receiving_checklists;
DO $$ BEGIN
  EXECUTE (SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.receiving_checklists', policyname), '; ') FROM pg_policies WHERE tablename='receiving_checklists' AND cmd='SELECT');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY "Role-restricted checklists select" ON public.receiving_checklists
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer') OR public.has_role(auth.uid(), 'finance'));

-- 5. qualification_history: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view qualification history" ON public.qualification_history;
CREATE POLICY "Role-restricted qualification history select" ON public.qualification_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer'));

-- 6. supplier_bonifications: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view bonifications" ON public.supplier_bonifications;
DO $$ BEGIN
  EXECUTE (SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.supplier_bonifications', policyname), '; ') FROM pg_policies WHERE tablename='supplier_bonifications' AND cmd='SELECT');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY "Role-restricted bonifications select" ON public.supplier_bonifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance') OR public.has_role(auth.uid(), 'buyer'));

-- 7. penalty_escalation_config: restrict SELECT
DO $$ BEGIN
  EXECUTE (SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.penalty_escalation_config', policyname), '; ') FROM pg_policies WHERE tablename='penalty_escalation_config' AND cmd='SELECT');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY "Role-restricted escalation config select" ON public.penalty_escalation_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));