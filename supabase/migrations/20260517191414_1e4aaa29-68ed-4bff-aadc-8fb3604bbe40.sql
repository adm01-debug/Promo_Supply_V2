-- Add follow-up tracking columns to cotacoes
ALTER TABLE public.cotacoes 
ADD COLUMN last_follow_up_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN follow_up_status TEXT;

-- Create an index for follow-up status to optimize filtering
CREATE INDEX idx_cotacoes_follow_up_status ON public.cotacoes(follow_up_status);
