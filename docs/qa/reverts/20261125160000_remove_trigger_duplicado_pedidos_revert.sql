-- ---------------------------------------------------------------------------
-- Reversao da migration 20261125160000_remove_trigger_duplicado_pedidos.sql
-- NAO executado automaticamente: arquivo de referencia, fora de
-- supabase/migrations/ de proposito (o canal de aplicacao so aceita arquivo
-- versionado em supabase/migrations/ e aplicado por dispatch manual).
--
-- Recria o trigger redundante exatamente como estava antes da remocao
-- (medido em prod 2026-11-24 via pg_get_triggerdef). Recriar e' seguro: a
-- funcao e' a mesma da outra variante e nao tem efeito colateral.
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_validate_pedido_status
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_pedido_status_transition();