-- Reversao de 20261126121047_guard_pedido_exige_solicitacao_aprovada.sql.
-- Nao e aplicada automaticamente (fica fora de supabase/migrations de proposito).

DROP TRIGGER IF EXISTS a1_guard_pedido_exige_solicitacao_aprovada ON public.pedidos;
DROP FUNCTION IF EXISTS public.guard_pedido_exige_solicitacao_aprovada();