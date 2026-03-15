-- Tighten RLS on SPOT integration tables
-- spot_sessions stores external session cookies and must not be readable/writable from client-side code.
DROP POLICY IF EXISTS "Authenticated users can manage spot sessions" ON public.spot_sessions;

-- spot_pedidos caches external supplier order data and should only be visible to the same roles allowed to use the integration.
DROP POLICY IF EXISTS "Authenticated users can view spot orders" ON public.spot_pedidos;

CREATE POLICY "Allowed roles can view spot orders"
ON public.spot_pedidos
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'coordinator'::public.app_role)
  OR has_role(auth.uid(), 'buyer'::public.app_role)
);