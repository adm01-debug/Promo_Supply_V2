-- Table for real-time bids in reverse auctions
CREATE TABLE IF NOT EXISTS public.licitacao_lances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licitacao_id UUID REFERENCES public.licitacoes(id) ON DELETE CASCADE,
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE CASCADE,
    valor_lance NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add reverse auction specific fields to licitacoes
ALTER TABLE public.licitacoes 
ADD COLUMN IF NOT EXISTS lance_minimo_decremento NUMERIC(15,2) DEFAULT 0.01,
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS current_best_bid NUMERIC(15,2);

-- Enable RLS
ALTER TABLE public.licitacao_lances ENABLE ROW LEVEL SECURITY;

-- Policies for bids
CREATE POLICY "Users can see bids for their auctions" 
ON public.licitacao_lances FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Suppliers can place bids" 
ON public.licitacao_lances FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Function to update best bid automatically
CREATE OR REPLACE FUNCTION public.update_licitacao_best_bid()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.licitacoes 
    SET current_best_bid = NEW.valor_lance
    WHERE id = NEW.licitacao_id AND (current_best_bid IS NULL OR NEW.valor_lance < current_best_bid);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for best bid
DROP TRIGGER IF EXISTS tr_update_best_bid ON public.licitacao_lances;
CREATE TRIGGER tr_update_best_bid
AFTER INSERT ON public.licitacao_lances
FOR EACH ROW
EXECUTE FUNCTION public.update_licitacao_best_bid();

-- Ensure real-time is enabled for lances
-- (This is usually done in the Supabase dashboard but we can hint at it)
COMMENT ON TABLE public.licitacao_lances IS 'Real-time bidding for reverse auctions.';
