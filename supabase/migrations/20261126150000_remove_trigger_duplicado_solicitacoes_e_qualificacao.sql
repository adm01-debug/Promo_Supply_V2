-- 149 (FN-09): dois pares de gatilhos ainda disparam a mesma funcao duas vezes
-- na mesma linha e no mesmo evento.
--
-- `pedidos` ja foi limpo em 20261125160000_remove_trigger_duplicado_pedidos.sql,
-- que manteve a variante BEFORE UPDATE OF status (dispara so quando o status
-- realmente muda) e removeu a BEFORE UPDATE (dispara em todo update). Aqui a
-- mesma decisao e aplicada aos pares que sobraram:
--
--   solicitacoes      validate_solicitacao_status_transition
--                     fica validate_solicitacao_status       (BEFORE UPDATE OF status)
--                     sai  trg_validate_solicitacao_status   (BEFORE UPDATE)
--   supplier_documents trigger_recalculate_qualification_score
--                     fica recalculate_qualification_on_document_change
--                          (INSERT OR UPDATE OR DELETE)
--                     sai  trg_recalculate_qualification_score (AFTER INSERT OR UPDATE)
--
-- Em supplier_documents a copia removida e a de menor cobertura: o gatilho que
-- fica continua recalculando em INSERT, UPDATE e DELETE, entao nenhum caminho
-- perde o recalculo -- ele apenas deixa de rodar duas vezes por documento, com
-- quatro agregacoes sobre supplier_documents/qualification_requirements e um
-- INSERT ... ON CONFLICT em supplier_qualification_scores a cada execucao.
--
-- Idempotente: DROP TRIGGER IF EXISTS. Reversao em *_revert_* do mesmo PR
-- (nao aplicado pelo deploy).

DROP TRIGGER IF EXISTS trg_validate_solicitacao_status ON public.solicitacoes;
DROP TRIGGER IF EXISTS trg_recalculate_qualification_score ON public.supplier_documents;