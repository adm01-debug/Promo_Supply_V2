-- Fix linter warning while preserving zero client-side access to external supplier session cookies.
CREATE POLICY "No client access to spot sessions"
ON public.spot_sessions
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);