-- Add classification codes to produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS codigo_unspsc TEXT,
ADD COLUMN IF NOT EXISTS codigo_cnae TEXT,
ADD COLUMN IF NOT EXISTS codigo_ncm TEXT;

-- Add index for analytics performance
CREATE INDEX IF NOT EXISTS idx_produtos_unspsc ON public.produtos(codigo_unspsc);
CREATE INDEX IF NOT EXISTS idx_produtos_cnae ON public.produtos(codigo_cnae);

-- Foundation for multi-currency
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS taxa_conversao NUMERIC DEFAULT 1.0;

ALTER TABLE public.cotacoes 
ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS taxa_conversao NUMERIC DEFAULT 1.0;

-- Comments for documentation
COMMENT ON COLUMN public.produtos.codigo_unspsc IS 'Código UNSPSC (8 dígitos) para taxonomia global de produtos e serviços.';
COMMENT ON COLUMN public.produtos.codigo_cnae IS 'Código CNAE para classificação nacional de atividades econômicas (Brasil).';
COMMENT ON COLUMN public.produtos.codigo_ncm IS 'Nomenclatura Comum do Mercosul para fins fiscais e tributários.';
