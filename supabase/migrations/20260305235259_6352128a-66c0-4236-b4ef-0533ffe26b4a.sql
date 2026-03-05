-- Fix 1: Profiles - restrict to own profile + admins
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Tighten supplier_documents (remove USING true)
DROP POLICY IF EXISTS "Authenticated users can manage supplier documents" ON public.supplier_documents;
DROP POLICY IF EXISTS "Authenticated users can view supplier documents" ON public.supplier_documents;

CREATE POLICY "Authenticated users can view supplier documents"
ON public.supplier_documents
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Buyers and admins can manage supplier documents"
ON public.supplier_documents
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);