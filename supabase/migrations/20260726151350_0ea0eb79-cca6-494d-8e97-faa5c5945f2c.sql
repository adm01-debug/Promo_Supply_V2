
GRANT SELECT ON public.xbz_produtos TO authenticated;
GRANT ALL ON public.xbz_produtos TO service_role;

CREATE INDEX IF NOT EXISTS idx_xbz_produtos_last_synced
  ON public.xbz_produtos (tenant_id, last_synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_xbz_produtos_nome_lower
  ON public.xbz_produtos (tenant_id, lower(nome));
