-- Add indexes for performance on dashboard queries
CREATE INDEX IF NOT EXISTS idx_solicitacoes_dashboard ON public.solicitacoes (status, created_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_dashboard ON public.pedidos (status, data_emissao);
CREATE INDEX IF NOT EXISTS idx_pagamentos_dashboard ON public.pagamentos (status, created_at);
CREATE INDEX IF NOT EXISTS idx_cotacoes_dashboard ON public.cotacoes (status, created_at);

-- Add organization filtering support if needed
CREATE INDEX IF NOT EXISTS idx_solicitacoes_org ON public.solicitacoes (organization_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_org ON public.pedidos (organization_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_org ON public.pagamentos (organization_id);
