-- Reversao de 20261126154500_rls_estoque_movimentacoes_papel_e_organizacao.sql.
-- Nao e aplicada automaticamente (fica fora de supabase/migrations de proposito).
-- Volta a policy permissiva e o corpo original de update_estoque_saldo().

BEGIN;

DROP POLICY IF EXISTS "estoque_movimentacoes_insert_papeis" ON public.estoque_movimentacoes;

CREATE POLICY "Movimentações: inserir na própria organização"
  ON public.estoque_movimentacoes FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.update_estoque_saldo()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
