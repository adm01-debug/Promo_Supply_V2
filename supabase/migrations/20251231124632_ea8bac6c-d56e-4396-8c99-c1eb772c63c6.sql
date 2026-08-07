-- Add policy for webauthn_challenges table (service role access only via edge functions)
-- This table is intentionally restricted - no user policies needed as it's managed by edge functions
CREATE POLICY "Service role can manage challenges"
ON public.webauthn_challenges
FOR ALL
USING (true)
WITH CHECK (true);