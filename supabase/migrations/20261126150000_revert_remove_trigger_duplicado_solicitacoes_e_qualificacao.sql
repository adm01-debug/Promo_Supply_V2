-- Reversao de 20261126150000_remove_trigger_duplicado_solicitacoes_e_qualificacao.sql
--
-- NAO esta no fluxo de deploy: existe para ser aplicado a mao caso a remocao
-- dos gatilhos precise ser desfeita. Recria os dois exatamente como estavam em
-- 20260317200943_0aa56f87-1df6-402d-8e21-1621b37baeb0.sql.
--
-- Atencao: recriar volta a executar a funcao duas vezes por evento.

CREATE TRIGGER trg_validate_solicitacao_status
    BEFORE UPDATE ON public.solicitacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_solicitacao_status_transition();

CREATE TRIGGER trg_recalculate_qualification_score
    AFTER INSERT OR UPDATE ON public.supplier_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_recalculate_qualification_score();