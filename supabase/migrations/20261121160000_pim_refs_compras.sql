-- PR 3.1: Referências ao PIM (Promo Gifts V4) nas tabelas de compras
-- Sem FK (banco diferente): integridade via edge function na escrita
-- produto_id permanece como campo legado (nullable), nada é removido nesta fase

alter table public.solicitacoes
  add column if not exists pim_product_id uuid,
  add column if not exists pim_variant_id  uuid;

alter table public.pedido_itens
  add column if not exists pim_product_id    uuid,
  add column if not exists pim_variant_id    uuid,
  add column if not exists codigo_fornecedor text,
  add column if not exists ncm               text,
  add column if not exists ipi_rate          numeric(8,4);

alter table public.repurchase_suggestions
  add column if not exists pim_product_id uuid;

alter table public.estoque
  add column if not exists pim_product_id uuid;  -- D-4(a): re-keyed para PIM

create index if not exists idx_pedido_itens_pim_product_id
  on public.pedido_itens (pim_product_id);

create index if not exists idx_solicitacoes_pim_product_id
  on public.solicitacoes (pim_product_id);
