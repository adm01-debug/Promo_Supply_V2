-- RLS-03 / etapa 028: movimentar estoque nao exigia papel e a trigger privilegiada
-- atualizava o saldo sem conferir a empresa do item.
--
-- Causa:
--   1. a unica policy de INSERT em public.estoque_movimentacoes (criada em
--      20260619145543_83e16148-2ff1-4c86-b6d2-53457b71844f.sql, nome
--      "Movimentações: inserir na própria organização") so comparava
--      organization_id com profiles.current_organization_id - sem has_role e sem
--      qualquer relacao entre organization_id e estoque_id (a FK garante apenas que
--      o id existe). Qualquer authenticated do grupo, inclusive viewer, criava
--      movimentacao.
--   2. public.update_estoque_saldo() e SECURITY DEFINER e faz
--      UPDATE public.estoque SET quantidade_atual = ... WHERE id = NEW.estoque_id
--      sem filtro de organizacao. Como a trigger roda com privilegio do dono, o item
--      de OUTRA organizacao tambem tinha o saldo alterado. Em contraste, a escrita
--      direta em estoque exige papel ("estoque_insert_papeis"/"estoque_update_papeis",
--      20261113123738_comprador_nao_altera_dados_de_outros.sql:156-171).
--
-- Correcao:
--   a. a policy de INSERT passa a exigir o mesmo predicado de estoque_insert_papeis
--      (organization_id = get_user_grupo_id() E papel admin/coordinator/buyer) MAIS a
--      coerencia do item: o estoque referenciado tem de pertencer a organizacao do
--      usuario. O nome antigo e dropado pelo nome exato para nao sobrar policy
--      permissiva em paralelo (policies em Postgres sao OR).
--   b. update_estoque_saldo() recusa (42501) movimentacao de item de outra
--      organizacao, no mesmo padrao de guard_solicitacao_escrita
--      (20261113123738_comprador_nao_altera_dados_de_outros.sql:69-106). O guard so
--      vale para chamadas com auth.uid() - service_role/cron (auth.uid() nulo)
--      continuam atualizando saldo como antes, para nao parar rotina deestoque.
--      O SECURITY DEFINER e mantido: sem ele o saldo deixaria de ser atualizado para
--      quem nao tem UPDATE em public.estoque e a movimentacao passaria a mentir.
--
-- Nao toca em: policies de public.estoque, src/hooks/useEstoque.ts, trigger
-- trigger_update_estoque_saldo (nome e momento continuam iguais).
-- Reversao: supabase/rollbacks/20261126154500_revert_rls_estoque_movimentacoes_papel_e_organizacao.sql

BEGIN;

DROP POLICY IF EXISTS "Movimentações: inserir na própria organização" ON public.estoque_movimentacoes;
DROP POLICY IF EXISTS "estoque_movimentacoes_insert_papeis" ON public.estoque_movimentacoes;

CREATE POLICY "estoque_movimentacoes_insert_papeis" ON public.estoque_movimentacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_grupo_id()
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'coordinator'::public.app_role)
         OR public.has_role(auth.uid(), 'buyer'::public.app_role))
    AND EXISTS (
      SELECT 1 FROM public.estoque e
      WHERE e.id = estoque_movimentacoes.estoque_id
        AND e.organization_id = public.get_user_grupo_id()
    )
  );

CREATE OR REPLACE FUNCTION public.update_estoque_saldo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  -- Guard RLS-03: o item tem de pertencer a organizacao de quem movimenta. Vale so
  -- para chamadas autenticadas; service_role/cron (auth.uid() nulo) segue como antes.
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.estoque e
      WHERE e.id = NEW.estoque_id
        AND e.organization_id = public.get_user_grupo_id()
    ) THEN
      RAISE EXCEPTION 'Movimentacao recusada: o item de estoque % nao pertence a organizacao do usuario.', NEW.estoque_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    IF (NEW.tipo IN ('entrada', 'ajuste') AND NEW.quantidade > 0) OR (NEW.tipo = 'saida' AND NEW.quantidade < 0) THEN
      UPDATE public.estoque
      SET quantidade_atual = quantidade_atual + NEW.quantidade,
          updated_at = now()
      WHERE id = NEW.estoque_id;
    ELSIF (NEW.tipo = 'saida' AND NEW.quantidade > 0) THEN
      UPDATE public.estoque
      SET quantidade_atual = quantidade_atual - NEW.quantidade,
          updated_at = now()
      WHERE id = NEW.estoque_id;
    ELSE
      UPDATE public.estoque
      SET quantidade_atual = quantidade_atual + NEW.quantidade,
          updated_at = now()
      WHERE id = NEW.estoque_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

COMMIT;
