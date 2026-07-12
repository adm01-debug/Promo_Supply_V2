-- Prevenir delegações sobrepostas ativas para o mesmo delegante
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.approval_delegations
  ADD CONSTRAINT approval_delegations_no_overlap
  EXCLUDE USING gist (
    delegante_id WITH =,
    tenant_id WITH =,
    tstzrange(data_inicio, data_fim, '[)') WITH &&
  ) WHERE (ativo = true);

-- Garantir data_fim > data_inicio
ALTER TABLE public.approval_delegations
  ADD CONSTRAINT approval_delegations_valid_range
  CHECK (data_fim > data_inicio);