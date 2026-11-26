-- Fix 1: Restrict account_lockouts to authenticated users only
DROP POLICY IF EXISTS "Anyone can check lockout status" ON public.account_lockouts;

CREATE POLICY "Authenticated users can check lockout status"
ON public.account_lockouts
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix 2: Restrict qualification_requirements to authenticated users
DROP POLICY IF EXISTS "Anyone can view qualification requirements" ON public.qualification_requirements;

CREATE POLICY "Authenticated users can view qualification requirements"
ON public.qualification_requirements
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix 3: Tighten supplier_qualification_scores RLS (remove true)
DROP POLICY IF EXISTS "Authenticated users can manage qualification scores" ON public.supplier_qualification_scores;
DROP POLICY IF EXISTS "Authenticated users can view qualification scores" ON public.supplier_qualification_scores;

CREATE POLICY "Authenticated users can view qualification scores"
ON public.supplier_qualification_scores
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage qualification scores"
ON public.supplier_qualification_scores
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix 4: Tighten qualification_history RLS (remove true)
DROP POLICY IF EXISTS "Authenticated users can view qualification history" ON public.qualification_history;
DROP POLICY IF EXISTS "Authenticated users can insert qualification history" ON public.qualification_history;

CREATE POLICY "Authenticated users can view qualification history"
ON public.qualification_history
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert qualification history"
ON public.qualification_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);