-- Integracao Promo Design -> Promo Supply (compras).
--
-- Fechamento de OS no Promo Design enfileira `os.closed`/`os.completed` e o
-- dispatcher entrega aqui, criando uma solicitacao de compra do material que
-- aquela ordem vai consumir.
--
-- Falta na tabela uma chave de idempotencia da origem. O dispatcher reenvia em
-- retry; `solicitacoes.numero` e unico mas e gerado aqui (SOL-000123), nao vem
-- do chamador, entao hoje um reenvio do mesmo fechamento de OS viraria outra
-- solicitacao e outra rodada de cotacao.
--
-- Nao altera nenhum CHECK: a solicitacao entra como `tipo = 'material'`, que ja
-- e valor valido desde 20251220181110. Item personalizado vai descrito no
-- titulo/observacoes, sem novo vocabulario para o comprador decorar.

ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS external_ref TEXT;

COMMENT ON COLUMN public.solicitacoes.external_ref IS
  'Chave de idempotencia da origem externa (ex.: service_orders.id do Promo Design).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitacoes_external_ref
  ON public.solicitacoes (external_ref)
  WHERE external_ref IS NOT NULL;