-- ============ SPOT API cache tables ============

CREATE TABLE public.spot_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type_code_legacy TEXT,
  type_code_new TEXT,
  category_name TEXT,
  catalogs TEXT[] NOT NULL DEFAULT '{}',
  brand TEXT,
  country_of_origin TEXT,
  main_image_url TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spot_produtos_type_legacy ON public.spot_produtos(type_code_legacy);
CREATE INDEX idx_spot_produtos_type_new ON public.spot_produtos(type_code_new);
CREATE INDEX idx_spot_produtos_catalogs ON public.spot_produtos USING GIN(catalogs);
CREATE INDEX idx_spot_produtos_name ON public.spot_produtos USING GIN (to_tsvector('portuguese', name));

GRANT SELECT ON public.spot_produtos TO authenticated;
GRANT ALL ON public.spot_produtos TO service_role;
ALTER TABLE public.spot_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allowed roles can view spot produtos" ON public.spot_produtos
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role));

CREATE TABLE public.spot_skus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  product_reference TEXT NOT NULL,
  color_code TEXT,
  color_name TEXT,
  color_hex TEXT,
  size TEXT,
  capacity TEXT,
  your_price NUMERIC(14,4),
  handling_costs NUMERIC(14,4),
  price_tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  table_codes_options TEXT,
  print_area TEXT,
  no_replenishment BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spot_skus_product_ref ON public.spot_skus(product_reference);
GRANT SELECT ON public.spot_skus TO authenticated;
GRANT ALL ON public.spot_skus TO service_role;
ALTER TABLE public.spot_skus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allowed roles can view spot skus" ON public.spot_skus
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role));

CREATE TABLE public.spot_customization_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_code TEXT NOT NULL UNIQUE,
  product_reference TEXT NOT NULL,
  component_id TEXT,
  location_id TEXT,
  table_code_option TEXT,
  technique_code TEXT,
  technique_name TEXT,
  area TEXT,
  max_colors INTEGER,
  allow_full_color BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  hotspot JSONB NOT NULL DEFAULT '{}'::jsonb,
  prices JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spot_custom_product_ref ON public.spot_customization_options(product_reference);
CREATE INDEX idx_spot_custom_default ON public.spot_customization_options(product_reference) WHERE is_default;
GRANT SELECT ON public.spot_customization_options TO authenticated;
GRANT ALL ON public.spot_customization_options TO service_role;
ALTER TABLE public.spot_customization_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allowed roles can view spot customization" ON public.spot_customization_options
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role));

CREATE TABLE public.spot_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  product_reference TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  incoming_quantity INTEGER,
  incoming_date DATE,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spot_estoque_product_ref ON public.spot_estoque(product_reference);
GRANT SELECT ON public.spot_estoque TO authenticated;
GRANT ALL ON public.spot_estoque TO service_role;
ALTER TABLE public.spot_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allowed roles can view spot estoque" ON public.spot_estoque
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role));

CREATE TABLE public.spot_api_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  action TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  error_code TEXT,
  error_message TEXT,
  records_processed INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  called_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spot_sync_log_endpoint_day ON public.spot_api_sync_log(endpoint, called_at DESC);
GRANT SELECT ON public.spot_api_sync_log TO authenticated;
GRANT ALL ON public.spot_api_sync_log TO service_role;
ALTER TABLE public.spot_api_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allowed roles can view spot sync log" ON public.spot_api_sync_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role));

-- ============ spot_pedidos: campos OrderV1 ============
ALTER TABLE public.spot_pedidos
  ADD COLUMN IF NOT EXISTS internal_reference TEXT,
  ADD COLUMN IF NOT EXISTS estimated_ship_date DATE,
  ADD COLUMN IF NOT EXISTS status_synced_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_spot_pedidos_internal_ref
  ON public.spot_pedidos(internal_reference) WHERE internal_reference IS NOT NULL;

-- ============ triggers updated_at ============
CREATE TRIGGER trg_spot_produtos_updated BEFORE UPDATE ON public.spot_produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_spot_skus_updated BEFORE UPDATE ON public.spot_skus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_spot_custom_updated BEFORE UPDATE ON public.spot_customization_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_spot_estoque_updated BEFORE UPDATE ON public.spot_estoque
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();