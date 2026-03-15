-- Table to persist SPOT session cookies
CREATE TABLE public.spot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_cookie text NOT NULL,
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  is_valid boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.spot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage spot sessions"
ON public.spot_sessions
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'coordinator'::app_role) 
  OR has_role(auth.uid(), 'buyer'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'coordinator'::app_role) 
  OR has_role(auth.uid(), 'buyer'::app_role)
);

-- Table to cache SPOT orders for tracking
CREATE TABLE public.spot_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_order_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'Submetida',
  status_color text,
  referencia_cliente text,
  data_pedido timestamp with time zone,
  valor_total numeric DEFAULT 0,
  transportadora text,
  codigo_rastreamento text,
  detalhes_url text,
  itens jsonb DEFAULT '[]'::jsonb,
  last_synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.spot_pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view spot orders"
ON public.spot_pedidos
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Buyers coordinators admins can manage spot orders"
ON public.spot_pedidos
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'coordinator'::app_role) 
  OR has_role(auth.uid(), 'buyer'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'coordinator'::app_role) 
  OR has_role(auth.uid(), 'buyer'::app_role)
);