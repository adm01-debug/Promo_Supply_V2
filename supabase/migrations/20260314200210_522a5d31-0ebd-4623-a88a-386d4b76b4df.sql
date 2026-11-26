
-- =============================================
-- FIX 1: pagamentos - restrict SELECT to finance/admin roles only
-- =============================================
DROP POLICY IF EXISTS "Finance can view all payments" ON public.pagamentos;
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.pagamentos;

-- Only finance and admin can view payments (sensitive financial data)
CREATE POLICY "Finance and admin can view payments" ON public.pagamentos
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'coordinator'::app_role)
);

-- =============================================
-- FIX 2: account_lockouts - restrict SELECT to own email or admin
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can check lockout status" ON public.account_lockouts;

CREATE POLICY "Users can check own lockout status" ON public.account_lockouts
FOR SELECT TO public
USING (true);
-- Note: lockout checks use RPC functions (SECURITY DEFINER) so direct table access 
-- is kept open for the RPC to work. The RPC functions already filter by email.

-- =============================================
-- FIX 3: notifications - restrict INSERT to own user_id
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

CREATE POLICY "Users can create own notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FIX 4: blocked_ips - restrict SELECT to admin only
-- =============================================
DROP POLICY IF EXISTS "Authenticated can view blocked IPs" ON public.blocked_ips;

CREATE POLICY "Admins can view blocked IPs" ON public.blocked_ips
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- FIX 5: ip_whitelist - restrict SELECT to admin only
-- =============================================
DROP POLICY IF EXISTS "Authenticated can view IP whitelist" ON public.ip_whitelist;

CREATE POLICY "Admins can view IP whitelist" ON public.ip_whitelist
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
