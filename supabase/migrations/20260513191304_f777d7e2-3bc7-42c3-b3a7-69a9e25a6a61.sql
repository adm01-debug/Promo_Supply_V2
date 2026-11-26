-- Tabela de Moedas
CREATE TABLE IF NOT EXISTS public.currencies (
  code CHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places SMALLINT NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed de Moedas (Obrigatório antes de adicionar FKs em tabelas com dados)
INSERT INTO public.currencies (code, name, symbol) VALUES
('BRL', 'Real Brasileiro', 'R$'),
('USD', 'US Dollar', '$'),
('EUR', 'Euro', '€'),
('CNY', 'Yuan Chinês', '¥')
ON CONFLICT (code) DO NOTHING;

-- Tabela de Taxas de Câmbio
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency CHAR(3) NOT NULL REFERENCES public.currencies(code),
  quote_currency CHAR(3) NOT NULL REFERENCES public.currencies(code),
  rate NUMERIC(18,8) NOT NULL,
  rate_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'exchangerate.host',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (base_currency, quote_currency, rate_date, source)
);

CREATE INDEX IF NOT EXISTS idx_fx_lookup ON public.exchange_rates(base_currency, quote_currency, rate_date DESC);

-- Adicionar colunas de preferência em profiles e tenants
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_locale TEXT NOT NULL DEFAULT 'pt-BR';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS default_currency CHAR(3) NOT NULL DEFAULT 'BRL' REFERENCES public.currencies(code);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS default_locale TEXT NOT NULL DEFAULT 'pt-BR';

-- Adicionar currency em tabelas transacionais principais
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'BRL' REFERENCES public.currencies(code);
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'BRL' REFERENCES public.currencies(code);
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'BRL' REFERENCES public.currencies(code);

-- Função para conversão de câmbio
CREATE OR REPLACE FUNCTION public.fx_convert(
  _amount NUMERIC, 
  _from CHAR(3), 
  _to CHAR(3), 
  _date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE 
    WHEN _from = _to THEN _amount
    ELSE _amount * (
      SELECT rate FROM public.exchange_rates
      WHERE base_currency = _from AND quote_currency = _to AND rate_date <= _date
      ORDER BY rate_date DESC LIMIT 1
    ) 
  END;
$$;

-- RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Currencies are viewable by everyone') THEN
        CREATE POLICY "Currencies are viewable by everyone" ON public.currencies FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Exchange rates are viewable by everyone') THEN
        CREATE POLICY "Exchange rates are viewable by everyone" ON public.exchange_rates FOR SELECT USING (true);
    END IF;
END $$;
