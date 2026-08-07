-- Harden account lockout visibility (prevent public email exposure)
DROP POLICY IF EXISTS "Users can check own lockout status" ON public.account_lockouts;
CREATE POLICY "Users can check own lockout status"
ON public.account_lockouts
FOR SELECT
TO authenticated
USING ((email = auth.email()) OR has_role(auth.uid(), 'admin'::app_role));

-- Harden login attempts insertion (prevent spoofing arbitrary emails)
DROP POLICY IF EXISTS "Authenticated can insert login attempts" ON public.login_attempts;
CREATE POLICY "Authenticated can insert login attempts"
ON public.login_attempts
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() IS NOT NULL) AND (auth.email() = email));

-- Remove duplicate SELECT policies and keep a single admin-only policy
DROP POLICY IF EXISTS "Admins can view all login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Admins can view login attempts" ON public.login_attempts;
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));