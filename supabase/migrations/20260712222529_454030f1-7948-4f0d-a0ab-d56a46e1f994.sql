
-- Wave 64: R-07 CHECK constraints on sourcing tables to prevent invalid data
ALTER TABLE public.sourcing_event_lots
  ADD CONSTRAINT sourcing_event_lots_quantidade_positive CHECK (quantidade > 0) NOT VALID,
  ADD CONSTRAINT sourcing_event_lots_ordem_nonneg CHECK (ordem >= 0) NOT VALID,
  ADD CONSTRAINT sourcing_event_lots_preco_ref_nonneg CHECK (preco_referencia IS NULL OR preco_referencia >= 0) NOT VALID;

ALTER TABLE public.sourcing_event_lots VALIDATE CONSTRAINT sourcing_event_lots_quantidade_positive;
ALTER TABLE public.sourcing_event_lots VALIDATE CONSTRAINT sourcing_event_lots_ordem_nonneg;
ALTER TABLE public.sourcing_event_lots VALIDATE CONSTRAINT sourcing_event_lots_preco_ref_nonneg;

ALTER TABLE public.sourcing_response_items
  ADD CONSTRAINT sourcing_response_items_preco_unitario_nonneg CHECK (preco_unitario >= 0) NOT VALID,
  ADD CONSTRAINT sourcing_response_items_preco_total_nonneg CHECK (preco_total >= 0) NOT VALID,
  ADD CONSTRAINT sourcing_response_items_prazo_nonneg CHECK (prazo_dias IS NULL OR prazo_dias >= 0) NOT VALID,
  ADD CONSTRAINT sourcing_response_items_validade_nonneg CHECK (validade_dias IS NULL OR validade_dias >= 0) NOT VALID;

ALTER TABLE public.sourcing_response_items VALIDATE CONSTRAINT sourcing_response_items_preco_unitario_nonneg;
ALTER TABLE public.sourcing_response_items VALIDATE CONSTRAINT sourcing_response_items_preco_total_nonneg;
ALTER TABLE public.sourcing_response_items VALIDATE CONSTRAINT sourcing_response_items_prazo_nonneg;
ALTER TABLE public.sourcing_response_items VALIDATE CONSTRAINT sourcing_response_items_validade_nonneg;

ALTER TABLE public.sourcing_responses
  ADD CONSTRAINT sourcing_responses_total_preco_nonneg CHECK (total_preco IS NULL OR total_preco >= 0) NOT VALID,
  ADD CONSTRAINT sourcing_responses_ranking_positive CHECK (ranking IS NULL OR ranking > 0) NOT VALID;

ALTER TABLE public.sourcing_responses VALIDATE CONSTRAINT sourcing_responses_total_preco_nonneg;
ALTER TABLE public.sourcing_responses VALIDATE CONSTRAINT sourcing_responses_ranking_positive;

ALTER TABLE public.sourcing_awards
  ADD CONSTRAINT sourcing_awards_valor_positive CHECK (valor_adjudicado > 0) NOT VALID,
  ADD CONSTRAINT sourcing_awards_saving_nonneg CHECK (saving_estimado IS NULL OR saving_estimado >= 0) NOT VALID;

ALTER TABLE public.sourcing_awards VALIDATE CONSTRAINT sourcing_awards_valor_positive;
ALTER TABLE public.sourcing_awards VALIDATE CONSTRAINT sourcing_awards_saving_nonneg;

ALTER TABLE public.sourcing_events
  ADD CONSTRAINT sourcing_events_budget_nonneg CHECK (budget_estimate IS NULL OR budget_estimate >= 0) NOT VALID,
  ADD CONSTRAINT sourcing_events_currency_iso CHECK (currency ~ '^[A-Z]{3}$') NOT VALID,
  ADD CONSTRAINT sourcing_events_dates_order CHECK (
    (starts_at IS NULL OR closes_at > starts_at)
    AND (evaluation_deadline IS NULL OR evaluation_deadline >= closes_at)
    AND (award_deadline IS NULL OR evaluation_deadline IS NULL OR award_deadline >= evaluation_deadline)
  ) NOT VALID;

ALTER TABLE public.sourcing_events VALIDATE CONSTRAINT sourcing_events_budget_nonneg;
-- Skip VALIDATE for currency/dates in case legacy rows violate; keep NOT VALID enforced for new rows only.
