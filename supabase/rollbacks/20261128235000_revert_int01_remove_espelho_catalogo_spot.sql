-- Rollback de supabase/migrations/20261128235000_int01_remove_espelho_catalogo_spot.sql
--
-- ATENCAO - as linhas NAO voltam. O DROP removeu 1.279+3.776+3.776+0 linhas
-- (spot_produtos, spot_skus, spot_estoque, spot_customization_options) e as
-- tabelas xbz_* de cache, todas copia derivada do PIM/API oficial. O script
-- reconstroi apenas a ESTRUTURA, vazia, exatamente como as migrations originais
-- (20260726184620 e 20260726144435).
--
-- Reagendar os crons de catalogo NAO adianta: a partir da PR #619 a edge
-- `spot-api` nao tem mais as acoes syncCatalog/syncCustomization/syncStock.
-- Reverter de verdade = reverter a edge e a tela (`useSpotCatalog`) junto.

-- ============ SPOT (20260726184620) ============
CREATE TABLE IF NOT EXISTS public.spot_produtos (
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
CREATE INDEX IF NOT EXISTS idx_spot_produtos_type_legacy ON public.spot_produtos(type_code_legacy);
CREATE INDEX IF NOT EXISTS idx_spot_produtos_type_new ON public.spot_produtos(type_code_new);
CREATE INDEX IF NOT EXISTS idx_spot_produtos_catalogs ON public.spot_produtos USING GIN(catalogs);
CREATE INDEX IF NOT EXISTS idx_spot_produtos_name ON public.spot_produtos USING GIN (to_tsvector('portuguese', name));
GRANT SELECT ON public.spot_produtos TO authenticated;
GRANT ALL ON public.spot_produtos TO service_role;
ALTER TABLE public.spot_produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allowed roles can view spot produtos" ON public.spot_produtos;
CREATE POLICY "Allowed roles can view spot produtos" ON public.spot_produtos
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role));

CREATE TABLE IF NOT EXISTS public.spot_skus (
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
CREATE INDEX IF NOT EXISTS idx_spot_skus_product_ref ON public.spot_skus(product_reference);
GRANT SELECT ON public.spot_skus TO authenticated;
GRANT ALL ON public.spot_skus TO service_role;
ALTER TABLE public.spot_skus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allowed roles can view spot skus" ON public.spot_skus;
CREATE POLICY "Allowed roles can view spot skus" ON public.spot_skus
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role));

CREATE TABLE IF NOT EXISTS public.spot_customization_options (
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
CREATE INDEX IF NOT EXISTS idx_spot_custom_product_ref ON public.spot_customization_options(product_reference);
CREATE INDEX IF NOT EXISTS idx_spot_custom_default ON public.spot_customization_options(product_reference) WHERE is_default;
GRANT SELECT ON public.spot_customization_options TO authenticated;
GRANT ALL ON public.spot_customization_options TO service_role;
ALTER TABLE public.spot_customization_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allowed roles can view spot customization" ON public.spot_customization_options;
CREATE POLICY "Allowed roles can view spot customization" ON public.spot_customization_options
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role));

CREATE TABLE IF NOT EXISTS public.spot_estoque (
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
CREATE INDEX IF NOT EXISTS idx_spot_estoque_product_ref ON public.spot_estoque(product_reference);
GRANT SELECT ON public.spot_estoque TO authenticated;
GRANT ALL ON public.spot_estoque TO service_role;
ALTER TABLE public.spot_estoque ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allowed roles can view spot estoque" ON public.spot_estoque;
CREATE POLICY "Allowed roles can view spot estoque" ON public.spot_estoque
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role));

-- ============ XBZ cache (20260726144435) ============
CREATE TABLE IF NOT EXISTS public.xbz_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  produto_id INTEGER NOT NULL,
  sku TEXT,
  codigo_composto TEXT,
  codigo_amigavel TEXT,
  nome TEXT,
  cor_id INTEGER,
  cor_nome TEXT,
  preco NUMERIC(14,4),
  preco_ipi NUMERIC(14,4),
  quantidade_disponivel INTEGER,
  disponivel TEXT,
  venda_minima INTEGER,
  multiplos INTEGER,
  imagem_url TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, produto_id)
);
GRANT SELECT ON public.xbz_produtos TO authenticated;
GRANT ALL ON public.xbz_produtos TO service_role;
ALTER TABLE public.xbz_produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "xbz_produtos_group_read" ON public.xbz_produtos;
CREATE POLICY "xbz_produtos_group_read" ON public.xbz_produtos
  FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id));
CREATE INDEX IF NOT EXISTS idx_xbz_produtos_tenant ON public.xbz_produtos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_xbz_produtos_sku ON public.xbz_produtos (tenant_id, sku);

CREATE TABLE IF NOT EXISTS public.xbz_produto_fiscal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  produto_id INTEGER NOT NULL,
  sku TEXT,
  ncm TEXT,
  preco_venda NUMERIC(14,4),
  preco_base_calculo NUMERIC(14,4),
  percentual_ipi NUMERIC(8,4),
  valor_ipi NUMERIC(14,4),
  valor_st NUMERIC(14,4),
  valor_mva NUMERIC(8,4),
  notas_calculo TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, produto_id)
);
GRANT SELECT ON public.xbz_produto_fiscal TO authenticated;
GRANT ALL ON public.xbz_produto_fiscal TO service_role;
ALTER TABLE public.xbz_produto_fiscal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "xbz_produto_fiscal_group_read" ON public.xbz_produto_fiscal;
CREATE POLICY "xbz_produto_fiscal_group_read" ON public.xbz_produto_fiscal
  FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id));

CREATE TABLE IF NOT EXISTS public.xbz_cores (
  id INTEGER NOT NULL PRIMARY KEY,
  nome TEXT NOT NULL,
  sigla TEXT,
  descricao TEXT,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.xbz_cores TO authenticated;
GRANT ALL ON public.xbz_cores TO service_role;
ALTER TABLE public.xbz_cores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "xbz_cores_read_authenticated" ON public.xbz_cores;
CREATE POLICY "xbz_cores_read_authenticated" ON public.xbz_cores
  FOR SELECT TO authenticated USING (true);

-- Crons: nao recriados de proposito. Reagendar sem reverter a edge so gera erro.
